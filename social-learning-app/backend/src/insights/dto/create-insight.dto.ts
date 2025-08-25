import { IsString, IsUUID, IsArray, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateInsightDto {
  @IsString()
  @MinLength(10)
  @MaxLength(280)
  content: string;

  @IsUUID()
  bookId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  pageReference?: string;

  @IsOptional()
  @IsString()
  chapterReference?: string;
}