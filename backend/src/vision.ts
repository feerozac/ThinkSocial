// Inkline - Qwen VL Vision Analysis (Alibaba Cloud DashScope)
// Used for multimodal analysis of images/video thumbnails in tweets

import OpenAI from 'openai';

// Lazy-initialize Qwen VL client
let _qwen: OpenAI | null = null;
function getQwenClient(): OpenAI {
  if (!_qwen) {
    _qwen = new OpenAI({
      apiKey: process.env.QWEN_API_KEY || '',
      baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'
    });
  }
  return _qwen;
}

const VISION_MODEL = 'qwen-vl-max';

// System prompt for visual analysis in the context of media literacy
const VISION_SYSTEM_PROMPT = `You are a visual media analyst for Inkline, a media literacy tool. Your job is to objectively describe what you see in images or video thumbnails from social media posts.

Focus on:
1. What is literally shown in the image/video frame
2. Any text overlays, captions, or watermarks visible
3. Whether the visual appears to be original footage, a screenshot, a meme, manipulated/edited, or AI-generated
4. The emotional tone of the visual (neutral, dramatic, shocking, humorous, etc.)
5. Any context clues about when/where this was captured
6. Whether the visual seems to support, contradict, or be unrelated to the accompanying tweet text

Be factual and objective. Do not speculate beyond what is visually evident. If something is unclear, say so.
Keep your response concise (2-4 sentences for simple images, up to a short paragraph for complex scenes).`;

/**
 * Analyze an image URL using Qwen VL
 * Returns a textual description of the visual content
 */
export async function analyzeImage(
  imageUrl: string,
  tweetText: string = '',
  author: string = 'Unknown'
): Promise<string> {
  try {
    console.log('[Inkline] Qwen VL: analyzing image...');

    const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      {
        type: 'image_url',
        image_url: { url: imageUrl }
      },
      {
        type: 'text',
        text: `This image accompanies a social media post by @${author}. The post text reads: "${tweetText.substring(0, 500)}"\n\nDescribe what you see in this image and how it relates to the post text.`
      }
    ];

    const response = await getQwenClient().chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: 'system',
          content: VISION_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: userContent as any
        }
      ],
      max_tokens: 500
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from Qwen VL');
    }

    console.log('[Inkline] Qwen VL: analysis complete');
    return content.trim();
  } catch (error) {
    console.error('[Inkline] Qwen VL error:', error);
    return '';
  }
}

/**
 * Analyze multiple images from a tweet
 * Returns a combined description
 */
export async function analyzeMultipleImages(
  imageUrls: string[],
  tweetText: string = '',
  author: string = 'Unknown'
): Promise<string> {
  if (imageUrls.length === 0) return '';

  // For a single image, use the simple path
  if (imageUrls.length === 1) {
    return analyzeImage(imageUrls[0], tweetText, author);
  }

  try {
    console.log(`[Inkline] Qwen VL: analyzing ${imageUrls.length} images...`);

    // Build content array with all images + text prompt
    const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

    for (const url of imageUrls.slice(0, 4)) { // Max 4 images
      userContent.push({
        type: 'image_url',
        image_url: { url }
      });
    }

    userContent.push({
      type: 'text',
      text: `These ${imageUrls.length} images accompany a social media post by @${author}. The post text reads: "${tweetText.substring(0, 500)}"\n\nDescribe what you see across these images and how they relate to the post text.`
    });

    const response = await getQwenClient().chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: 'system',
          content: VISION_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: userContent as any
        }
      ],
      max_tokens: 600
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from Qwen VL');
    }

    console.log('[Inkline] Qwen VL: multi-image analysis complete');
    return content.trim();
  } catch (error) {
    console.error('[Inkline] Qwen VL multi-image error:', error);
    return '';
  }
}

/**
 * Check if Qwen VL is configured and available
 */
export function isVisionAvailable(): boolean {
  return !!(process.env.QWEN_API_KEY && process.env.QWEN_API_KEY.length > 5);
}
