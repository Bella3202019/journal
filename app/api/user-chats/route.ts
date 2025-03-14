import { getUserChatIdsAdmin } from '@/lib/db-admin';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const chatIds = await getUserChatIdsAdmin(userId);
    return NextResponse.json({ chatIds });
  } catch (error) {
    console.error('Error fetching chat IDs:', error);
    return NextResponse.json({ error: 'Failed to fetch chat IDs' }, { status: 500 });
  }
}
