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
            console.log('analyzeImage called with data type:', typeof imageData);
            console.log('imageData length:', imageData ? imageData.length : 'null');
            console.log('imageData sample:', imageData ? imageData.substring(0, 20) : 'null');
            
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
                details: `## DEBUG INFO\n- Image data type: ${typeof imageData}\n- Image data length: ${imageData.length}\n- Image data sample: ${imageData.substring(0, 50)}...\n\n## Item Identification\n- **Type of item:** Test Item\n- **Brand and model:** Debug Model\n- **Color and design features:** N/A\n\n## Condition Assessment\n- **Overall condition:** Debug\n- **Any visible wear or damage:** None\n- **Age estimation based on appearance:** N/A`,
                marketResearch: `## Debug Market Research\n- This is a debug response.\n- No actual analysis was performed.`,
                name: "Debug Item",
                category: "Test",
                condition: "Debug",
                estimatedValue: "N/A"
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
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            
            // Return a fallback response with error details
            return {
                details: `## Error Analyzing Image\n\nWe encountered an error while analyzing your image. Please try again later.\n\nError details: ${error.message}\n\nStack: ${error.stack}`,
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

## Showcase Recommendations
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