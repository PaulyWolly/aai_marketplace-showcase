const OpenAI = require('openai');
require('dotenv').config();

class OpenAIService {
    constructor() {
        try {
            // Clean up the API key by removing any newlines or whitespace
            const apiKey = process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.replace(/\s+/g, '') : '';
            
            if (!apiKey) {
                console.error('OpenAI API key is missing or invalid');
                return;
            }
            
            // For debugging, log a masked version of the API key
            const maskedKey = apiKey ? 
                `${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}` : 
                'Not available';
            console.log('Using API key (masked):', maskedKey);
            console.log('Using model:', process.env.OPENAI_MODEL || 'gpt-4o');
            
            this.openai = new OpenAI({
                apiKey: apiKey,
                dangerouslyAllowBrowser: true
            });
            console.log('OpenAI service initialized successfully');
        } catch (error) {
            console.error('Error initializing OpenAI service:', error);
        }
    }

    async analyzeImage(imageData) {
        try {
            if (!imageData) {
                throw new Error('No image data provided');
            }

            // Extract basic information about the image
            const metadata = this.extractImageMetadata(imageData);
            console.log('Image metadata:', metadata);

            // For debugging, log the API key (partially masked)
            const maskedKey = process.env.OPENAI_API_KEY ? 
                `${process.env.OPENAI_API_KEY.substring(0, 5)}...${process.env.OPENAI_API_KEY.substring(process.env.OPENAI_API_KEY.length - 5)}` : 
                'Not available';
            console.log('Using API key (masked):', maskedKey);
            console.log('Using model:', process.env.OPENAI_MODEL || 'gpt-4o');

            // Get initial analysis using GPT-4 Turbo with vision capabilities
            console.log('Attempting to analyze image with OpenAI...');
            
            // TEMPORARY: Return hardcoded sample data for testing
            // This bypasses the actual API call to help debug other issues
            return {
                details: `## Item Identification
- **Type of item:** Headphones
- **Brand and model:** The brand logo appears visible but specific details are blurry. However, based on the design it looks similar to models possibly from brands like Logitech or Plantronics, specifically designed for communication or gaming.
- **Color and design features:** Black color with chrome accents; over-the-ear design with a padded headband and a boom mic, indicating its use for communications or gaming.

## Condition Assessment
- **Overall condition:** Looks to be in good condition with minimal wear.
- **Any visible wear or damage:** There is no apparent damage visible in the image, suggesting careful usage.
- **Age estimation based on appearance:** Likely a few years old given its design and condition, which still appears modern.

## Key Features
- **Technical specifications:** Specifics like impedance, driver size, and frequency range aren't visible, but it features a boom microphone which typically suggests it's good for communications or gaming.
- **Notable features:** Includes an adjustable boom microphone and potentially noise-canceling technology. This headset might also feature in-line volume control and mute functions (not visible in the image). It appears to be wired rather than wireless.
- **Materials used:** Primarily appears to be made from plastic with some parts possibly in metal (chrome sections), foam padding on ear cups and headband.

## Market Value
- **Estimated price range:** $40-80 USD depending on the exact model and brand.
- **Factors affecting value:** Brand reputation, specific features (like surround sound capability), and overall condition.
- **Comparable items in market:** Similar to mid-range gaming headsets from brands like Logitech G, HyperX, or Plantronics.

## Additional Notes
- **Unique characteristics:** The boom microphone design suggests this is specifically intended for clear voice communication, making it suitable for gaming, video conferencing, or other communication-focused applications.
- **Authenticity indicators:** Without seeing the brand markings clearly, it's difficult to assess authenticity.
- **Market demand:** Gaming and communication headsets maintain steady demand, especially with the rise of remote work and online gaming.`,
                marketResearch: `## Market Trends
- **Current trends in headphone technology:** The gaming and communication headset market is seeing increased demand for wireless options, better microphone quality, and enhanced comfort for long sessions. RGB lighting and software customization are also becoming standard features in gaming models.
- **Consumer preferences:** Users are increasingly looking for multi-platform compatibility, durability, and comfort as primary factors when purchasing headsets in this category.

## Price Analysis
- **Price comparisons:** Mid-range wired gaming/communication headsets typically retail between $40-100 USD across major retailers like Amazon, Best Buy, and manufacturer direct stores.
- **Price ranges:** New models in this category typically sell for $60-100, while used models in good condition range from $30-60, and refurbished units from reputable sellers fall in the $40-70 range.

## Value Retention
- **Factors affecting depreciation:** Gaming headsets typically depreciate 30-50% in the first year after release, with factors like brand reputation, build quality, and feature set affecting the depreciation rate.
- **Long-term value prediction:** This style of headset will likely continue to depreciate gradually, retaining approximately 20-30% of its original value after 3-4 years if maintained in good condition.

## Marketplace Insights
- **Best platforms for buying/selling:** For used gaming peripherals, platforms like eBay, r/hardwareswap on Reddit, and Facebook Marketplace offer the best combination of audience reach and reasonable fees.
- **Regional price variations:** North American and European markets typically command higher prices for gaming peripherals compared to Asian markets where similar products might be available at lower price points.

## Comparable Alternatives
- **Similar models:** Comparable products include the Logitech G432 ($50-80), HyperX Cloud II ($70-100), and Razer Kraken ($60-90), all offering similar functionality and build quality.
- **Competitive advantages/disadvantages:** Without knowing the exact model, it's difficult to assess specific advantages, but the wired connection offers reliability while lacking the convenience of wireless options that are becoming increasingly popular.

## Investment Potential
- **Collectibility factors:** Standard gaming headsets generally have minimal collectible value unless they are limited editions or associated with popular esports teams or events.
- **Future market outlook:** The market for wired headsets is gradually shrinking as wireless technology improves, but there remains a steady demand from users who prefer the reliability and lower latency of wired connections, particularly in competitive gaming scenarios.`,
                name: "Gaming Headset",
                category: "Electronics",
                condition: "Good",
                estimatedValue: "$40-80"
            };

            /* UNCOMMENT THIS SECTION WHEN API IS WORKING PROPERLY
            // Prepare the message for the API
            const messages = [
                {
                    role: "system",
                    content: "You are an expert appraiser specializing in identifying and valuing items from images. Provide detailed analysis in Markdown format."
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Analyze this item in detail. Provide a comprehensive appraisal including item identification, condition assessment, key features, market value, and any additional notes. Format your response in Markdown with clear sections and bullet points."
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${imageData}`
                            }
                        }
                    ]
                }
            ];

            // Make the API call
            const completion = await this.openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || "gpt-4o",
                messages: messages,
                max_tokens: 1500
            });

            // Extract the analysis from the response
            const analysis = completion.choices[0].message.content;
            console.log('Analysis received from OpenAI');

            // Now get market research
            const marketResearch = await this.searchSimilarProducts(analysis);
            console.log('Market research received from OpenAI');

            // Extract key information from the analysis
            const nameMatch = analysis.match(/\*\*Type of item:\*\* (.*?)(?:\r|\n|$)/);
            const categoryMatch = analysis.match(/\*\*Category:\*\* (.*?)(?:\r|\n|$)/);
            const conditionMatch = analysis.match(/\*\*Overall condition:\*\* (.*?)(?:\r|\n|$)/);
            const valueMatch = analysis.match(/\*\*Estimated price range:\*\* (.*?)(?:\r|\n|$)/);

            return {
                details: analysis,
                marketResearch: marketResearch,
                name: nameMatch ? nameMatch[1] : "Unknown Item",
                category: categoryMatch ? categoryMatch[1] : "Miscellaneous",
                condition: conditionMatch ? conditionMatch[1] : "Unknown",
                estimatedValue: valueMatch ? valueMatch[1] : "Unknown"
            };
            */
        } catch (error) {
            console.error('Error analyzing image:', error);
            
            // Return a fallback response with error details
            return {
                details: `## Error Analyzing Image\n\nWe encountered an error while analyzing your image. Please try again later.\n\nError details: ${error.message}`,
                marketResearch: `## Market Research Unavailable\n\nMarket research is currently unavailable due to a technical issue. Please try again later.`,
                name: "Analysis Failed",
                category: "Error",
                condition: "Unknown",
                estimatedValue: "Unable to determine"
            };
        }
    }

    extractImageMetadata(imageData) {
        // Extract basic information about the image
        const isBase64 = imageData.startsWith('data:image/');
        const format = isBase64 ? imageData.split(';')[0].split('/')[1] : 'unknown';
        const size = Math.round(imageData.length / 1024); // Size in KB

        return {
            format,
            size,
            timestamp: new Date().toISOString()
        };
    }

    async searchSimilarProducts(description) {
        try {
            const response = await this.openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: `You are AAI's (Appraise An Item) market research expert specializing in consumer electronics. 
                        Provide a detailed market analysis in Markdown format with the following sections:
                        
## Current Market Prices
- Price ranges from multiple retailers
- Average prices for new, used, and refurbished items

## Price Trends
- Recent price movements (increasing/decreasing)
- Seasonal pricing patterns

## Condition Impact
- How condition affects value
- Price variations by condition grade

## Regional Variations
- Price differences by region
- Availability considerations

## Marketplace Recommendations
- Best platforms for buying/selling
- Tips for maximizing value

## Market Outlook
- Future price predictions
- Factors that may affect value

Use proper Markdown formatting with headings, bullet points, tables, and emphasis where appropriate. Make sure to use **bold** and *italic* text for emphasis.`
                    },
                    {
                        role: "user",
                        content: `Based on this item description, provide detailed market research and pricing information: ${description}`
                    }
                ],
                max_tokens: 1500
            });

            return response.choices[0].message.content;
        } catch (error) {
            console.error('OpenAI API Error:', error);
            
            // Return a fallback response for debugging
            return `## Error Generating Market Research
- There was an error generating market research: ${error.message}
- Please try again later or contact support.`;
        }
    }
}

module.exports = new OpenAIService(); 