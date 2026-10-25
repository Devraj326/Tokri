import { Body, Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { CreateKitDto } from './dto/create-kit.dto.js';
import { KitAiService } from './kit-ai.service.js';

@Controller('kits')
@UseGuards(JwtAuthGuard)
export class KitAiController {
  constructor(private readonly kitAi: KitAiService) {}

  @Post()
  async createKit(@CurrentUser() userId: string, @Body() dto: CreateKitDto, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    try {
      const generator = this.kitAi.resolveKit(userId, dto.prompt, dto.storeId, dto.servings);
      let next = await generator.next();
      while (!next.done) {
        res.write(`event: item\ndata: ${JSON.stringify(next.value)}\n\n`);
        next = await generator.next();
      }
      res.write(`event: done\ndata: ${JSON.stringify(next.value)}\n\n`);
    } catch (err: any) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: err?.message ?? 'Kit assistant failed' })}\n\n`);
    } finally {
      res.end();
    }
  }

  @Get(':id')
  getKit(@Param('id') id: string) {
    return this.kitAi.getKit(id);
  }

  @Post(':id/add-to-cart')
  addToCart(@CurrentUser() userId: string, @Param('id') id: string, @Body('cartId') cartId: string) {
    return this.kitAi.addToCart(id, userId, cartId);
  }

  @Post(':id/feedback')
  feedback(@CurrentUser() userId: string, @Param('id') id: string, @Body('correction') correction: string) {
    return this.kitAi.feedback(id, userId, correction);
  }
}
