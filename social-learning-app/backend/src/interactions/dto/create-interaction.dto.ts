import { IsEnum, IsUUID, IsOptional, IsObject } from 'class-validator';
import type { InteractionType } from '../../entities/interaction.entity';

export class CreateInteractionDto {
  @IsEnum(['like', 'share', 'save', 'apply'])
  type: InteractionType;

  @IsUUID()
  insightId: string;

  @IsOptional()
  @IsObject()
  metadata?: {
    shareTarget?: string;
    applicationNotes?: string;
  };
}