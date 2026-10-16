"""Document parsers package.

Each parser accepts a file path and returns a list of ParsedPage objects.
Parsers are stateless — they do not write to the database.
"""

from app.parsers.base import ParsedDocument, ParsedPage
from app.parsers.docx_parser import DocxParser
from app.parsers.pdf_parser import PdfParser
from app.parsers.txt_parser import TxtParser

__all__ = ["ParsedPage", "ParsedDocument", "PdfParser", "DocxParser", "TxtParser"]
