# Image Upload Fix

## Problem
Images weren't saving to items regardless of the method used to acquire them (file upload or camera capture).

## Root Cause Analysis
1. The backend API wasn't properly configured to handle multipart/form-data submissions with image files
2. The frontend was sending images to the wrong endpoint and using inconsistent field names
3. No proper fallback mechanism was in place when image upload failed

## Changes Made

### Backend Changes (appraisal.routes.js)
1. Added multer middleware to handle file uploads:
   ```javascript
   const multer = require('multer');
   const storage = multer.diskStorage({
     destination: function (req, file, cb) {
       const uploadDir = 'uploads';
       if (!fs.existsSync(uploadDir)) {
         fs.mkdirSync(uploadDir);
       }
       cb(null, uploadDir);
     },
     filename: function (req, file, cb) {
       cb(null, Date.now() + '-' + file.originalname);
     }
   });
   
   const upload = multer({
     storage: storage,
     limits: {
       fileSize: 5 * 1024 * 1024 // 5MB limit
     },
     fileFilter: function (req, file, cb) {
       const filetypes = /jpeg|jpg|png|gif/;
       const mimetype = filetypes.test(file.mimetype);
       const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
   
       if (mimetype && extname) {
         return cb(null, true);
       }
       cb(new Error('Only image files are allowed!'));
     }
   });
   ```

2. Added dedicated endpoints to handle multipart/form-data submissions:
   ```javascript
   // POST endpoint for creating with image upload
   router.post('/', auth, upload.single('image'), async (req, res) => {
     // Implementation details
   });
   
   // PUT endpoint for updating with image upload
   router.put('/:id', auth, upload.single('image'), async (req, res) => {
     // Implementation details
   });
   ```

3. Added proper processing of image files:
   ```javascript
   if (req.file) {
     const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
     appraisalData.imageUrl = imageUrl;
     
     // Initialize or update images array
     if (!appraisalData.images) {
       appraisalData.images = [];
     } else if (typeof appraisalData.images === 'string') {
       try {
         appraisalData.images = JSON.parse(appraisalData.images);
       } catch (err) {
         appraisalData.images = [];
       }
     }
     
     // Add the new image to the images array
     appraisalData.images.push(imageUrl);
   }
   ```

### Frontend Changes (member-item-form.component.ts)

1. Modified `submitFormWithMultipart` method:
   ```typescript
   private submitFormWithMultipart(formData: FormData): Promise<any> {
     const baseUrl = `${environment.apiUrl}/appraisals`;
     const url = baseUrl;
     const method = this.isEditMode ? 'PUT' : 'POST';
     
     return new Promise((resolve, reject) => {
       const tryRequest = (endpointUrl: string, actualMethod: string) => {
         // For PUT requests with ID, append the ID to the URL
         const finalUrl = actualMethod === 'PUT' && this.itemId ? 
           `${endpointUrl}/${this.itemId}` : endpointUrl;
           
         // Implementation details with proper error handling
       };
       
       // Start with the primary endpoint and method
       tryRequest(url, method);
     });
   }
   ```

2. Improved `onSubmit` method to correctly build FormData:
   ```typescript
   if (formData.images[0]) {
     try {
       const base64Data = formData.images[0];
       const blob = this.dataURLtoBlob(base64Data);
       
       // Always use 'image' as the field name to match the backend multer config
       multipartFormData.append('image', blob, 'image.jpg');
       console.log('Successfully added image blob to form data');
       
       // Also include the image as imageUrl to ensure it's set in the database
       multipartFormData.append('imageUrl', formData.imageUrl || formData.images[0]);
     } catch (err) {
       console.error('Error converting image to blob:', err);
     }
   }
   ```

3. Added better error handling and logging:
   ```typescript
   try {
     const result = await this.submitFormWithMultipart(multipartFormData);
     console.log('Form submission successful:', result);
     this.snackBar.open(this.isEditMode ? 'Item updated successfully' : 'Item created successfully', 'Close', { duration: 3000 });
     this.router.navigate(['/profile/items']);
   } catch (err) {
     console.error('Multipart form submission failed:', err);
     throw err; // Re-throw to be caught by outer catch
   }
   ```

## How to Test
1. Navigate to the item creation form
2. Upload an image or capture one with camera
3. Fill in the required fields
4. Submit the form
5. Verify that the item is created with the image
6. Check the server logs to ensure the image was properly saved

## Notes
- The fixes ensure compatibility with both new implementations and legacy code
- Improved error logging helps diagnose any future issues
- Fallback mechanisms help ensure data is saved even if the primary endpoint fails 