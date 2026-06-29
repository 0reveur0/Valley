import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Documents API ready',
    example: {
      title: 'Sample document',
      fileUrl: 'https://res.cloudinary.com/demo/raw/upload/sample.pdf',
      previewPattern: 'https://res.cloudinary.com/demo/image/upload/v1/sample-page-{{page}}.jpg'
    }
  });
}
