import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MessageRole } from '../../generated/prisma/enums.js';
import { Prisma } from '../../generated/prisma/client.js';

@Injectable()
export class MessageService {
  constructor(private readonly prismaService: PrismaService) {}

  async saveMessage(role: MessageRole, content: string, chatId: string) {
    const message: Prisma.MessageCreateInput = {
      chatId,
      role,
      content,
    };
    return this.prismaService.message.create({ data: message });
  }

  async retrieveMessage(chatId: string, numberOfLastConversation: number) {
    const messages = await this.prismaService.message.findMany({
      where: {
        chatId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: numberOfLastConversation,
    });

    return {
      messages: messages.reverse().map((msg) => ({
        role: msg.role === MessageRole.User ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })),
    };
  }
}