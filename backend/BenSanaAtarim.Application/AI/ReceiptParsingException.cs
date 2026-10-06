namespace BenSanaAtarim.Application.AI;

public sealed class ReceiptParsingException(string message, Exception? innerException = null) : Exception(message, innerException);
