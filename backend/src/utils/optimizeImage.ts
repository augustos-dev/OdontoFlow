import sharp from 'sharp';

/**
 * Converte e otimiza imagens enviadas via buffer para formato WebP compacto.
 * @param buffer Buffer da imagem vinda do multer
 * @param maxWidth Largura máxima para redimensionar (padrão: 1200px)
 * @param quality Qualidade do WebP (0 a 100, padrão: 80)
 */
export const optimizeImage = async (
  buffer: Buffer,
  maxWidth = 1200,
  quality = 80
): Promise<Buffer> => {
  return await sharp(buffer)
    .resize({
      width: maxWidth,
      withoutEnlargement: true, // Não amplia imagens menores que maxWidth
      fit: 'inside',
    })
    .toFormat('webp', { quality }) // WebP é extremamente leve e de alta fidelidade
    .toBuffer();
};