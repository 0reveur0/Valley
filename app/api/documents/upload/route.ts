import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { cloudinary } from '@/lib/cloudinary';
import { prisma } from '@/lib/prisma';
import { moderateContentWithAI } from '@/lib/ai-moderation';

const UPLOAD_REWARD_CREDITS = 10;

export async function POST(request: Request) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // ── Input validation ──────────────────────────────────────────────────────
    const formData  = await request.formData();
    const file      = formData.get('file');
    const titleRaw  = formData.get('title');
    const descRaw   = formData.get('description');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are allowed.' }, { status: 400 });
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'File must be 20 MB or smaller.' }, { status: 400 });
    }

    const title       = typeof titleRaw === 'string' && titleRaw.trim()
      ? titleRaw.trim()
      : file.name.replace(/\.pdf$/i, '');
    const description = typeof descRaw === 'string' ? descRaw.trim() : '';

    // ── Upload to Cloudinary ──────────────────────────────────────────────────
    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadResult = await new Promise<{ secure_url: string; pages?: number }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'valley_documents/originals',
            resource_type: 'raw',
            format: 'pdf',
            transformation: [{ pages: true }, { fetch_format: 'auto' }],
          },
          (error, result) => {
            if (error || !result) {
              reject(error ?? new Error('Cloudinary upload failed.'));
              return;
            }
            resolve({ secure_url: result.secure_url, pages: result.pages as number | undefined });
          },
        );
        stream.end(buffer);
      },
    );

    const previewPattern = process.env.CLOUDINARY_CLOUD_NAME
      ? `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/valley_documents/previews/{{page}}.jpg`
      : '';

    // ── AI content moderation ─────────────────────────────────────────────────
    // Called after Cloudinary upload so the file is safe regardless of verdict.
    // Returns one of three statuses:
    //   'Approved' — AI cleared it   → publish immediately + award credits
    //   'Rejected' — AI flagged it   → store with rejection reason, no credits
    //   'Pending'  — AI call failed  → queue for manual admin review, no credits
    const moderation = await moderateContentWithAI(title, description, file.name);

    // ── Resolve or create default category ───────────────────────────────────
    const categoryId =
      (await prisma.category.findFirst())?.id ??
      (await prisma.category.create({ data: { name: 'General', slug: 'general' } })).id;

    const baseDocData = {
      title,
      description: description || 'Uploaded via Valley',
      slug: `${Date.now()}-${file.name.replace(/\s+/g, '-').toLowerCase()}`,
      fileUrl: uploadResult.secure_url,
      previewPattern,
      totalPages: uploadResult.pages ?? 0,
      userId: session.user.id,
      categoryId,
    } as const;

    // ── Persist to DB — branch on moderation verdict ──────────────────────────

    if (moderation.status === 'Approved') {
      // Atomic: create document + credit uploader + log reward in one transaction
      const [doc] = await prisma.$transaction([
        prisma.document.create({
          data: { ...baseDocData, status: 'Approved' },
        }),
        prisma.user.update({
          where: { id: session.user.id },
          data: { credits: { increment: UPLOAD_REWARD_CREDITS } },
        }),
        prisma.transaction.create({
          data: {
            userId: session.user.id,
            type: 'Upload_Reward',
            points: UPLOAD_REWARD_CREDITS,
            amount: null,
            status: 'Completed',
          },
        }),
      ]);

      return NextResponse.json(
        {
          message: `Tài liệu đã được duyệt và đăng tải thành công. Bạn nhận được +${UPLOAD_REWARD_CREDITS} điểm thưởng!`,
          document: {
            id: doc.id,
            title: doc.title,
            fileUrl: doc.fileUrl,
            totalPages: doc.totalPages,
            status: doc.status,
          },
          creditsAwarded: UPLOAD_REWARD_CREDITS,
        },
        { status: 201 },
      );
    }

    if (moderation.status === 'Rejected') {
      // Store with rejection reason so the user can see why
      const doc = await prisma.document.create({
        data: {
          ...baseDocData,
          status: 'Rejected',
          rejectionReason: moderation.reason || 'Nội dung không phù hợp với tiêu chuẩn cộng đồng.',
        },
      });

      return NextResponse.json(
        {
          error: 'Tài liệu của bạn đã bị từ chối bởi hệ thống kiểm duyệt tự động.',
          rejectionReason: moderation.reason,
          document: {
            id: doc.id,
            title: doc.title,
            status: doc.status,
          },
        },
        { status: 422 }, // Unprocessable Entity — content policy violation
      );
    }

    // moderation.status === 'Pending': AI call failed → queue for manual review
    if (moderation.status === 'Pending') {
      const doc = await prisma.document.create({
        data: { ...baseDocData, status: 'Pending' },
      });

      return NextResponse.json(
        {
          message:
            'Tài liệu của bạn đã được tải lên và đang chờ kiểm duyệt thủ công. Chúng tôi sẽ thông báo khi hoàn tất.',
          document: {
            id: doc.id,
            title: doc.title,
            fileUrl: doc.fileUrl,
            totalPages: doc.totalPages,
            status: doc.status,
          },
        },
        { status: 202 }, // Accepted — processing deferred
      );
    }

    // Exhaustive check — TypeScript will error here if a new status is added
    // to ModerationResult without updating this route.
    const _exhaustive: never = moderation.status;
    console.error('[upload] unhandled moderation status:', _exhaustive);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  } catch (error) {
    console.error('[upload] error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
