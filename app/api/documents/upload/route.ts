import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { cloudinary } from '@/lib/cloudinary';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const title = formData.get('title');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are allowed.' }, { status: 400 });
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'File must be 20MB or smaller.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadResult = await new Promise<{ secure_url: string; pages?: number }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'valley_documents/originals',
          resource_type: 'raw',
          format: 'pdf',
          transformation: [
            { pages: true },
            { fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error || !result) {
            reject(error || new Error('Cloudinary upload failed.'));
            return;
          }
          resolve({ secure_url: result.secure_url, pages: result.pages as number | undefined });
        }
      );

      uploadStream.end(buffer);
    });

    const previewPattern = `${process.env.CLOUDINARY_CLOUD_NAME ? `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}` : ''}/image/upload/valley_documents/previews/{{page}}.jpg`;

    const document = await prisma.document.create({
      data: {
        title: typeof title === 'string' && title.trim() ? title.trim() : file.name.replace(/\.pdf$/i, ''),
        description: 'Uploaded via Valley',
        slug: `${Date.now()}-${file.name.replace(/\s+/g, '-').toLowerCase()}`,
        fileUrl: uploadResult.secure_url,
        previewPattern,
        totalPages: uploadResult.pages ?? 0,
        status: 'Pending',
        userId: session.user.id,
        categoryId: (await prisma.category.findFirst())?.id ?? (await prisma.category.create({ data: { name: 'General', slug: 'general' } })).id,
      },
    });

    return NextResponse.json({
      message: 'Document uploaded successfully.',
      document: {
        id: document.id,
        title: document.title,
        fileUrl: document.fileUrl,
        totalPages: document.totalPages,
        status: document.status,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
