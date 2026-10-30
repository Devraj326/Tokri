import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ReviewsController } from './reviews.controller.js';
import { ReviewsService } from './reviews.service.js';

@Module({
  imports: [JwtModule.register({})],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
