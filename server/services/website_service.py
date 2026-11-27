import requests
from bs4 import BeautifulSoup
from typing import Dict, Any
from urllib.parse import urlparse

def extract_text_from_url(url: str) -> Dict[str, Any]:
    """Extract readable learning content from a website URL."""
    # Basic URL validation
    parsed = urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        raise ValueError("Invalid URL format. Please include http:// or https://")
        
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 FlashAI/1.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=12)
        response.raise_for_status()
    except requests.exceptions.Timeout:
        raise ValueError("Website request timed out. The server took too long to respond.")
    except requests.exceptions.RequestException as e:
        raise ValueError(f"Could not retrieve webpage: {str(e)}")
        
    soup = BeautifulSoup(response.content, "html.parser")
    
    # Remove unwanted tags
    for tag in soup(["script", "style", "nav", "footer", "header", "noscript", "aside", "svg", "form", "iframe"]):
        tag.decompose()
        
    # Find page title
    title = ""
    if soup.title and soup.title.string:
        title = soup.title.string.strip()
    elif soup.find("h1"):
        title = soup.find("h1").get_text().strip()
    else:
        title = parsed.netloc
        
    # Target main content if article or main tag exists
    main_container = soup.find("article") or soup.find("main") or soup.find(id=lambda x: x and ("content" in x or "main" in x)) or soup.body
    
    if not main_container:
        raise ValueError("Could not find readable content on this webpage.")
        
    paragraphs = []
    for elem in main_container.find_all(["h1", "h2", "h3", "h4", "p", "li"]):
        txt = elem.get_text().strip()
        if len(txt) > 20:  # Avoid nav fragments and tiny buttons
            paragraphs.append(txt)
            
    full_text = "\n\n".join(paragraphs).strip()
    
    if len(full_text) < 100:
        # Fallback to general body text
        full_text = main_container.get_text(separator="\n", strip=True)
        
    if len(full_text) < 50:
        raise ValueError("Webpage does not contain sufficient readable text.")
        
    return {
        "url": url,
        "title": title[:100],
        "source_type": "website",
        "text": full_text[:25000],  # Cap for reasonable prompt size
        "word_count": len(full_text.split())
    }
