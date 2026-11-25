import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/entities/user-role.enum';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin)
  create(@Body() input: CreateInventoryItemDto) {
    return this.inventory.create(input);
  }

  @Get('low-stock')
  findLowStock() {
    return this.inventory.findLowStock();
  }

  @Get()
  findAll() {
    return this.inventory.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.inventory.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() input: UpdateInventoryItemDto,
  ) {
    return this.inventory.update(id, input);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.inventory.remove(id);
    return { message: 'Inventory item deleted successfully.' };
  }
}
