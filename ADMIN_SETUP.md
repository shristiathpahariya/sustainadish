# Admin Recipe Review Panel

## Overview

The Admin Recipe Review Panel allows administrators to moderate community-submitted recipes. Admins can view all pending recipes, review their details, and approve or reject them.

## Access

1. **Configure Admin Emails**: Set the `ADMIN_EMAILS` environment variable in your backend `.env` file:
   ```
   ADMIN_EMAILS=admin@example.com,another-admin@example.com
   ```

2. **Login**: Log in with an email that's in the admin list

3. **Navigate**: Go to `/admin/review` in your browser

## Features

### Recipe Queue
- View all recipes with `pending_review` status
- Search by recipe title or author name
- Pagination with configurable page size (20 recipes per page)

### Recipe Review
- Click the "Eye" icon to view full recipe details
- See ingredients list and cooking instructions
- View author information and submission date

### Approval Actions
- **Approve**: Click the green checkmark to approve a recipe
  - Changes status to `published`
  - Sets `trainingStatus` to `pending`
  - Updates author's contribution count
  
- **Reject**: Click the red X to reject a recipe
  - Opens a dialog requiring a rejection reason
  - Changes status to `rejected`
  - Stores reason with the recipe
  - Reason is provided to the author

### Status Badges
- **Pending**: Orange badge (recipes awaiting review)
- **Published**: Green badge (approved recipes)
- **Rejected**: Red badge (rejected recipes)

## API Endpoints

### GET `/api/admin/recipes/pending`
Retrieves recipes pending review

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 50)

**Response:**
```json
{
  "recipes": [...],
  "page": 1,
  "limit": 20,
  "total": 45,
  "totalPages": 3
}
```

### POST `/api/admin/recipes/:recipeId/approve`
Approves a recipe

**Response:**
```json
{
  "success": true,
  "recipe": {...}
}
```

### POST `/api/admin/recipes/:recipeId/reject`
Rejects a recipe

**Request Body:**
```json
{
  "reason": "Incomplete instructions"
}
```

**Response:**
```json
{
  "success": true,
  "recipe": {...}
}
```

## Authentication

All admin endpoints require:
1. Valid JWT authentication
2. User email matches `ADMIN_EMAILS` environment variable

Unauthorized access returns:
- `401` if not authenticated
- `403` if not an admin
- `500` if admin emails not configured

## Design System

The admin panel follows the same green editorial design system as the rest of the application:
- Colors: Primary green (#059669), cream background (#faf8f3)
- Typography: Playfair Display for headings, Space Mono for UI labels
- Icons: Lucide React icons
- Responsive: Mobile-friendly with tabular view on desktop

## Development Notes

### Component Structure
- `AdminRecipeReview.jsx`: Main component
- `AdminRecipeReview.css`: Styles matching CommunityRecipes.css

### Reusable Utilities
- `splitIngredients()`: Parse ingredients from various formats
- `splitInstructions()`: Parse instructions from various formats
- `formatDate()`: Format dates consistently
- `getAuthorName()`: Normalize author display names

### State Management
- Uses `useUser()` context for authentication
- Uses `useMessageDialog()` for notifications
- Optimistic UI updates for better UX

## Troubleshooting

### Access Denied (403)
- Verify your email is in `ADMIN_EMAILS`
- Check you're logged in with the correct email
- Ensure `.env` file is loaded correctly

### No Recipes Showing
- Check if recipes have `pending_review` status
- Verify database connection
- Check browser console for errors

### Actions Not Working
- Verify backend is running
- Check network tab for failed API calls
- Review server logs for errors