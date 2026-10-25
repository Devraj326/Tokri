import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { CreateAddressDto } from './dto/create-address.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UsersService } from './users.service.js';

@Controller()
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('users/me')
  me(@CurrentUser() userId: string) {
    return this.users.me(userId);
  }

  @Patch('users/me')
  update(@CurrentUser() userId: string, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(userId, dto);
  }

  @Get('addresses')
  addresses(@CurrentUser() userId: string) {
    return this.users.listAddresses(userId);
  }

  @Post('addresses')
  createAddress(@CurrentUser() userId: string, @Body() dto: CreateAddressDto) {
    return this.users.createAddress(userId, dto);
  }

  @Get('pantry')
  pantry(@CurrentUser() userId: string) {
    return this.users.pantryItems(userId);
  }

  @Post('pantry')
  addPantry(@CurrentUser() userId: string, @Body('name') name: string, @Body('kind') kind: 'pantry' | 'tool' = 'pantry') {
    return this.users.addPantryItem(userId, name, kind);
  }
}
