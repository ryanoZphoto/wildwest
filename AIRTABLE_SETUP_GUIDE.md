# 🏗️ Airtable Database Setup Guide for Wild West Wall Art

## Step-by-Step Instructions to Make Your Gallery Work

---

## Step 1: Create Your Airtable Account & Base

### 1A. Go to Airtable.com
- Open [airtable.com](https://airtable.com) in your web browser
- Click "Sign up for free" (top right corner)

### 1B. Create a New Base
- After signing up, click "Start from scratch" or "Add a base"
- Name your base: `Wild West Wall Art Products`
- Choose "Grid" view (default)

---

## Step 2: Set Up the Products Table

### 2A. Create the Table
- Your base opens with a default "Table 1"
- Click the table name "Table 1" and rename it to: `Products`

### 2B. Add ALL Required Fields (VERY IMPORTANT!)

Click the "+" button to add each of these fields in this exact order:

| Field Name | Field Type | How to Set It Up | Purpose |
|------------|------------|------------------|---------|
| **Title** | Single Line Text | Just add the field | Product name (shown everywhere) |
| **Description** | Long Text | Just add the field | Full product description |
| **ShortDescription** | Long Text | Just add the field | Brief description for cards |
| **Category** | Single Select | Add options: Landscapes, Abstracts, Wildlife, Other | Product category |
| **Tags** | Multiple Select | Add options: Arizona, Desert, Mountain, Wildlife, etc. | Search tags separated by commas |
| **MainImage** | Attachment | Just add the field | Primary product image |
| **GalleryImages** | Attachment | Just add the field | Additional product images |
| **AcrylicPreview** | Attachment | Just add the field | Preview image for acrylic finish |
| **MetalPreview** | Attachment | Just add the field | Preview image for metal finish |
| **CanvasPreview** | Attachment | Just add the field | Preview image for canvas finish |
| **Acrylic20x40** | Number | Just add the field | Price for 20x40 acrylic |
| **Acrylic24x36** | Number | Just add the field | Price for 24x36 acrylic |
| **Acrylic20x30** | Number | Just add the field | Price for 20x30 acrylic |
| **Acrylic16x24** | Number | Just add the field | Price for 16x24 acrylic |
| **Metal20x40** | Number | Just add the field | Price for 20x40 metal |
| **Metal24x36** | Number | Just add the field | Price for 24x36 metal |
| **Metal20x30** | Number | Just add the field | Price for 20x30 metal |
| **Metal16x24** | Number | Just add the field | Price for 16x24 metal |
| **Canvas20x40** | Number | Just add the field | Price for 20x40 canvas |
| **Canvas24x36** | Number | Just add the field | Price for 24x36 canvas |
| **Canvas20x30** | Number | Just add the field | Price for 20x30 canvas |
| **Canvas16x24** | Number | Just add the field | Price for 16x24 canvas |
| **SEOTitle** | Single Line Text | Just add the field | SEO title for search engines |
| **SEODescription** | Long Text | Just add the field | SEO description for search |
| **Featured** | Checkbox | Just add the field | Mark as featured product |
| **InStock** | Checkbox | Just add the field | Product availability |
| **Stock** | Number | Just add the field | Stock quantity (optional) |
| **Artist** | Single Line Text | Just add the field | Artist name (default: Ryan Osmun) |

---

## Step 3: Add Your First Test Product

### 3A. Click the "+" to Add Your First Row
- This creates a new product record

### 3B. Fill in the Basic Information
**Title:** `Superstition Mountain Landscape`
**Description:** `Striking landscape photograph of Superstition Mountain in Arizona. Perfect for western decor.`
**ShortDescription:** `Beautiful Arizona desert landscape`
**Category:** Choose `Landscapes` from dropdown
**Tags:** Select `Arizona`, `Desert`, `Mountain`
**Artist:** `Ryan Osmun`

### 3C. Upload Images (CRITICAL STEP!)

**MainImage:**
- Click the attachment field
- Upload your main product image (example: `superstitionmtn.jpg`)

**AcrylicPreview:**
- Click the attachment field
- Upload the acrylic preview image (example: `superstitionmtn_acrylic.jpg`)

**MetalPreview:**
- Upload the metal preview image (example: `superstitionmtn_metal.jpg`)

**CanvasPreview:**
- Upload the canvas preview image (example: `superstitionmtn_canvas.jpg`)

### 3D. Set Prices

Set these prices in the appropriate fields:

**Acrylic Prices:**
- Acrylic20x40: `180`
- Acrylic24x36: `130`
- Acrylic20x30: `100`
- Acrylic16x24: `60`

**Metal Prices:**
- Metal20x40: `220`
- Metal24x36: `150`
- Metal20x30: `120`
- Metal16x24: `70`

**Canvas Prices:**
- Canvas20x40: `180`
- Canvas24x36: `130`
- Canvas20x30: `100`
- Canvas16x24: `60`

### 3E. Set Other Options
- **Featured:** Check if you want it featured
- **InStock:** Check to make it available for purchase
- **SEOTitle:** `Superstition Mountain - Premium Western Wall Art`
- **SEODescription:** `Buy Superstition Mountain landscape wall art in acrylic, metal, or canvas. Perfect for western and desert decor.`

---

## Step 4: Test Your Setup

### 4A. Save Your Changes
- Close the row editor (click outside or press Esc)
- Your product should appear in the table

### 4B. Check Your Website
- Open your website in a browser
- Go to the gallery page: `yourdomain.com/gallery.html`
- You should now see your product!

### 4C. Test Product Page
- Click on your product in the gallery
- Should take you to: `yourdomain.com/product.html?id=YOUR_PRODUCT_ID`
- Should show full product details, options, and cart functionality

---

## Step 5: Add More Products

### For Each Additional Product:
1. Click the "+" button to add a new row
2. Fill in Title, Description, Category
3. Upload MainImage
4. Upload finish preview images (AcrylicPreview, MetalPreview, CanvasPreview)
5. Set prices for all size/finish combinations
6. Add Tags, SEO info, etc.
7. Mark as InStock
8. Save the row

### Quick Add Multiple Products:
- Use the forms view in Airtable for faster product entry
- Copy/paste similar products and just change images and titles

---

## Step 6: Verify API Access

### 6A. Check Your API Connection
- Go to Airtable Account Settings → Developer Hub → Personal Access Tokens
- Make sure your token from earlier is still there
- It should have "data.records:read" permission

### 6B. Test API Access
- In Airtable, copy your base URL from the address bar
- It should look like: `https://airtable.com/appA7gCgL62MSyunY/tblXXXXXXXXX`
- Your Base ID is: `appA7gCgL62MSyunY`
- The table ID will be in the URL after `/tbl`

---

## Common Issues & Troubleshooting

### Problem: Gallery shows "No products found"
**Solution:** Check that:
- You have at least one product in the Products table
- The product has "InStock" checked
- Images are uploaded to MainImage field
- The product has prices set

### Problem: Product page shows nothing
**Solution:** Check that:
- The product ID in the URL matches your Airtable record ID
- All image fields have actual uploaded images
- The product has all required fields filled

### Problem: Cart not working
**Solution:** Check that:
- Prices are set for the selected finish/size combination
- The product has MainImage uploaded
- Browser localStorage is enabled

### Problem: API Connection Failed
**Solution:** Check that:
- Your Personal Access Token is correct
- Token has read permissions
- Base ID matches exactly

---

## Field Reference Sheet

### Required Fields (must be filled):
- ✅ Title
- ✅ MainImage
- ✅ At least one set of prices (Acrylic/Metal/Canvas)
- ✅ At least one finish preview image
- ✅ InStock (checked)
- ✅ Description

### Optional Fields (nice to have):
- GalleryImages (additional product photos)
- Tags (for search)
- Category (for organization)
- SEO fields (for search engines)
- Featured (for homepage highlighting)

---

## Example Products to Add

Use your existing images from these folders to create products:

**Existing Photos Folder:**
- abstract.jpg
- antelopecanyon.jpg
- buffalo.jpg
- monument costco.jpg
- rainbowstorm.jpg
- superstitionmtn.jpg
- utahbigarch.jpg

**Existing Previews:**
- acrylic_previews/
- canvas_previews/
- metal_previews/

---

## 🔄 Import Your Old Products

To quickly migrate your existing products:

1. Use the old `master_products.csv` file
2. Create Airtable records matching:
   - Title (from csv)
   - Description (from csv)
   - Link (from csv)
   - Image (from csv)
   - Availability (from csv)

Your website is now ready to work with your Airtable data! 🎯

---

*Need more help? Let me know exactly where you're stuck in this process.*
