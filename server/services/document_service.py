import io
import re
from typing import Dict, Any, List

def extract_text_from_pdf(file_bytes: bytes, filename: str = "document.pdf") -> Dict[str, Any]:
    """Extract text from PDF pages using pypdf."""
    from pypdf import PdfReader
    
    reader = PdfReader(io.BytesIO(file_bytes))
    num_pages = len(reader.pages)
    extracted_pages: List[str] = []
    
    for idx, page in enumerate(reader.pages):
        page_text = page.extract_text() or ""
        if page_text.strip():
            extracted_pages.append(f"--- [Page {idx + 1}] ---\n{page_text.strip()}")
            
    full_text = "\n\n".join(extracted_pages).strip()
    if not full_text:
        raise ValueError("Could not extract any readable text from this PDF. It may be scanned or image-only.")
        
    return {
        "filename": filename,
        "source_type": "pdf",
        "page_count": num_pages,
        "text": full_text,
        "word_count": len(full_text.split())
    }

def extract_text_from_docx(file_bytes: bytes, filename: str = "document.docx") -> Dict[str, Any]:
    """Extract text from Word (.docx) documents."""
    import docx
    
    doc = docx.Document(io.BytesIO(file_bytes))
    paragraphs = []
    
    for p in doc.paragraphs:
        txt = p.text.strip()
        if txt:
            paragraphs.append(txt)
            
    # Also extract any tables
    for table in doc.tables:
        for row in table.rows:
            row_text = [cell.text.strip() for cell in row.cells if cell.text.strip()]
            if row_text:
                paragraphs.append(" | ".join(row_text))
                
    full_text = "\n\n".join(paragraphs).strip()
    if not full_text:
        raise ValueError("Could not extract any readable text from this Word document.")
        
    return {
        "filename": filename,
        "source_type": "docx",
        "text": full_text,
        "word_count": len(full_text.split())
    }

def extract_text_from_pptx(file_bytes: bytes, filename: str = "presentation.pptx") -> Dict[str, Any]:
    """Extract text from PowerPoint (.pptx) slides."""
    from pptx import Presentation
    
    prs = Presentation(io.BytesIO(file_bytes))
    slide_texts: List[str] = []
    
    for idx, slide in enumerate(prs.slides):
        slide_parts = []
        for shape in slide.shapes:
            if shape.has_text_frame:
                for paragraph in shape.text_frame.paragraphs:
                    line = paragraph.text.strip()
                    if line:
                        slide_parts.append(line)
        if slide_parts:
            slide_content = "\n".join(slide_parts)
            slide_texts.append(f"--- [Slide {idx + 1}] ---\n{slide_content}")
            
    full_text = "\n\n".join(slide_texts).strip()
    if not full_text:
        raise ValueError("Could not extract text from this PowerPoint presentation.")
        
    return {
        "filename": filename,
        "source_type": "pptx",
        "slide_count": len(prs.slides),
        "text": full_text,
        "word_count": len(full_text.split())
    }

def extract_text_from_notes(notes: str, title: str = "Study Notes") -> Dict[str, Any]:
    """Format plain-text student notes."""
    cleaned = notes.strip()
    if not cleaned:
        raise ValueError("Notes cannot be empty.")
    return {
        "filename": title,
        "source_type": "notes",
        "text": cleaned,
        "word_count": len(cleaned.split())
    }
