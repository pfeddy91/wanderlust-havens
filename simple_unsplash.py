import argparse
import requests
import json
import os
from datetime import datetime

# Unsplash API credentials
UNSPLASH_ACCESS_KEY = "x49l7PRQ_Du5MyKVvAK_Y4FTjcWXEzUgMtnp4SQeG8s"

def search_unsplash(query, per_page=10):
    """
    Search Unsplash for images
    
    Args:
        query: Search query
        per_page: Number of images to return per page
    
    Returns:
        List of image objects
    """
    try:
        # Construct the URL
        url = "https://api.unsplash.com/search/photos"
        
        # Set up parameters
        params = {
            "query": query,
            "per_page": per_page,
            "orientation": "landscape",  # Prefer landscape images for tours
            "content_filter": "high"     # High quality content only
        }
        
        # Set up headers
        headers = {
            "Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"
        }
        
        # Make the request
        print(f"Searching Unsplash for: {query}")
        response = requests.get(url, params=params, headers=headers)
        
        if not response.ok:
            print(f"Unsplash API error: {response.status_code} - {response.text[:200]}...")
            return []
            
        result = response.json()
        
        if 'results' not in result:
            print(f"Unexpected response format from Unsplash API")
            return []
            
        images = result['results']
        print(f"Found {len(images)} images on Unsplash for query: {query}")
        
        return images
        
    except Exception as e:
        print(f"Error searching Unsplash: {e}")
        return []

def save_results_to_file(search_term, images):
    """
    Save search results to a JSON file
    
    Args:
        search_term: The search term used
        images: List of image objects from Unsplash
    """
    # Create a directory for results if it doesn't exist
    os.makedirs("unsplash_results", exist_ok=True)
    
    # Create a filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"unsplash_results/{search_term.replace(' ', '_')}_{timestamp}.json"
    
    # Extract relevant information from each image
    simplified_images = []
    for img in images:
        simplified_images.append({
            "id": img.get("id"),
            "description": img.get("description") or img.get("alt_description") or "",
            "urls": {
                "raw": img.get("urls", {}).get("raw"),
                "full": img.get("urls", {}).get("full"),
                "regular": img.get("urls", {}).get("regular"),
                "small": img.get("urls", {}).get("small"),
                "thumb": img.get("urls", {}).get("thumb")
            },
            "user": {
                "name": img.get("user", {}).get("name"),
                "username": img.get("user", {}).get("username"),
                "portfolio_url": img.get("user", {}).get("portfolio_url")
            },
            "likes": img.get("likes"),
            "created_at": img.get("created_at")
        })
    
    # Save to file
    with open(filename, 'w') as f:
        json.dump({
            "search_term": search_term,
            "timestamp": timestamp,
            "count": len(simplified_images),
            "images": simplified_images
        }, f, indent=2)
    
    print(f"Results saved to {filename}")

def display_image_info(images):
    """
    Display basic information about the images
    
    Args:
        images: List of image objects from Unsplash
    """
    print("\n=== Image Results ===")
    for i, img in enumerate(images, 1):
        print(f"\nImage {i}:")
        print(f"ID: {img.get('id')}")
        print(f"Description: {img.get('description') or img.get('alt_description') or 'No description'}")
        print(f"URL: {img.get('urls', {}).get('regular')}")
        print(f"Photographer: {img.get('user', {}).get('name')} (@{img.get('user', {}).get('username')})")
        print(f"Likes: {img.get('likes')}")
        print("-" * 40)

def main():
    """
    Main function
    """
    parser = argparse.ArgumentParser(description='Simple Unsplash image search')
    parser.add_argument('search_term', help='Search term for Unsplash')
    parser.add_argument('--count', type=int, default=10, help='Number of images to return (default: 10)')
    args = parser.parse_args()
    
    print("=" * 80)
    print(f"Unsplash Simple Search")
    print(f"Search term: {args.search_term}")
    print(f"Count: {args.count}")
    print("=" * 80)
    
    # Search Unsplash
    images = search_unsplash(args.search_term, args.count)
    
    if not images:
        print("No images found.")
        return
    
    # Display image information
    display_image_info(images)
    
    # Save results to file
    save_results_to_file(args.search_term, images)
    
    print("\nDone!")

if __name__ == "__main__":
    main()