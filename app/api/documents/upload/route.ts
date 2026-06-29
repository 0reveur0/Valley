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
    const formData = await request.formData();
    const file        = formData.get('file');
    const titleRaw    = formData.get('title');
    const descRaw     = formData.get('description');

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
        const uploadStream = cloudinary.uploader.upload_stream(
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
        uploadStream.end(buffer);
      },
    );

    const previewPattern = process.env.CLOUDINARY_CLOUD_NAME
      ? `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/valley_documents/previews/{{page}}.jpg`
      : '';

    // ── AI content moderation ─────────────────────────────────────────────────
    // Runs concurrently with nothing else at this point — the Cloudinary URL is
    // already settled.  We pass the original filename as an extra signal.
    const moderation = await moderateContentWithAI(title, description, file.name);

    const documentStatus: 'Approved' | 'Rejected' = moderation.approved
      ? 'Approved'
      : 'Rejected';

    // ── Resolve category (create "General" if the table is empty) ─────────────
    const categoryId =
      (await prisma.category.findFirst())?.id ??
      (await prisma.category.create({ data: { name: 'General', slug: 'general' } })).id;

    // ── Persist to DB ─────────────────────────────────────────────────────────
    // When approved: atomically create the document + reward the uploader.
    // When rejected: create the document with rejection reason, no credit reward.
    let savedDocument: { id: string; title: string; fileUrl: string; totalPages: number; status: string };

    if (moderation.approved) {
      const [doc] = await prisma.$transaction([
        // 1. Create the document record
        prisma.document.create({
          data: {
            title,
            description: description || 'Uploaded via Valley',
            slug: `${Date.now()}-${file.name.replace(/\s+/g, '-').toLowerCase()}`,
            fileUrl: uploadResult.secure_url,
            previewPattern,
            totalPages: uploadResult.pages ?? 0,
            status: 'Approved',
            userId: session.user.id,
            categoryId,
          },
        }),
        // 2. Credit the uploader
        prisma.user.update({
          where: { id: session.user.id },
          data: { credits: { increment: UPLOAD_REWARD_CREDITS } },
        }),
        // 3. Log the reward transaction
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
      savedDocument = doc;
    } else {
      savedDocument = await prisma.document.create({
        data: {
          title,
          description: description || 'Uploaded via Valley',
          slug: `${Date.now()}-${file.name.replace(/\s+/g, '-').toLowerCase()}`,
          fileUrl: uploadResult.secure_url,
          previewPattern,
          totalPages: uploadResult.pages ?? 0,
          status: 'Rejected',
          rejectionReason: moderation.reason || 'Nội dung không phù hợp với tiêu chuẩn cộng đồng.',
          userId: session.user.id,
          categoryId,
        },
      });
    }

    // ── Response ──────────────────────────────────────────────────────────────
    if (!moderation.approved) {
      return NextResponse.json(
        {
          error: 'Tài liệu của bạn đã bị từ chối bởi hệ thống kiểm duyệt tự động.',
          rejectionReason: moderation.reason,
          document: {
            id: savedDocument.id,
            title: savedDocument.title,
            status: savedDocument.status,
          },
        },
        { status: 422 }, // Unprocessable Entity — file was saved but content rejected
      );
    }

    return NextResponse.json(
      {
        message: `Tài liệu đã được duyệt và đăng tải thành công. Bạn nhận được +${UPLOAD_REWARD_CREDITS} điểm thưởng!`,
        document: {
          id: savedDocument.id,
          title: savedDocument.title,
          fileUrl: savedDocument.fileUrl,
          totalPages: savedDocument.totalPages,
          status: savedDocument.status,
        },
        creditsAwarded: UPLOAD_REWARD_CREDITS,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[upload] error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
