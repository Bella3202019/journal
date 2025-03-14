import { HumeService } from '@/lib/hume-server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const chats = await HumeService.listChats();
    return NextResponse.json(chats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
  }
} 