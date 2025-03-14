import { HumeService } from '@/lib/hume-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
  }

  try {
    const events = await HumeService.getChatEvents(chatId);
    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching chat events:', error);
    return NextResponse.json({ error: 'Failed to fetch chat events' }, { status: 500 });
  }
} 