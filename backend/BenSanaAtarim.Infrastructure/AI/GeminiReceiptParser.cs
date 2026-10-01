using System.Net.Http.Json;
using System.Text.Json;
using BenSanaAtarim.Application.AI;
using BenSanaAtarim.Application.AI.Models;
using Microsoft.Extensions.Configuration;

namespace BenSanaAtarim.Infrastructure.AI;

public sealed class GeminiReceiptParser(HttpClient httpClient, IConfiguration configuration) : IReceiptParser
{
    private const string Prompt = """
        Analyze this receipt image and extract only the receipt data.
        Return each line item's printed name, quantity, and unit price, plus the printed service charge.
        Do not calculate totals, shares, split types, taxes, discounts, or any other business values.
        Use 0 for serviceCharge when the receipt does not show one.
        Use quantity 1 only when an item is listed once without an explicit quantity.
        """;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public async Task<ReceiptParseResult> ParseAsync(Stream receiptImage, string mediaType, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(receiptImage);

        if (!receiptImage.CanRead)
        {
            throw new ArgumentException("Receipt image stream must be readable.", nameof(receiptImage));
        }

        if (string.IsNullOrWhiteSpace(mediaType) || !mediaType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("A valid image media type is required.", nameof(mediaType));
        }

        var apiKey = configuration["Gemini:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException("Gemini API key is not configured.");
        }

        var model = configuration["Gemini:Model"];
        if (string.IsNullOrWhiteSpace(model))
        {
            throw new InvalidOperationException("Gemini model is not configured.");
        }

        using var buffer = new MemoryStream();
        await receiptImage.CopyToAsync(buffer, cancellationToken);

        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    role = "user",
                    parts = new object[]
                    {
                        new { text = Prompt },
                        new
                        {
                            inlineData = new
                            {
                                mimeType = mediaType,
                                data = Convert.ToBase64String(buffer.ToArray())
                            }
                        }
                    }
                }
            },
            generationConfig = new
            {
                temperature = 0,
                responseMimeType = "application/json",
                responseSchema = new
                {
                    type = "OBJECT",
                    properties = new
                    {
                        serviceCharge = new { type = "NUMBER" },
                        items = new
                        {
                            type = "ARRAY",
                            items = new
                            {
                                type = "OBJECT",
                                properties = new
                                {
                                    name = new { type = "STRING" },
                                    quantity = new { type = "INTEGER" },
                                    unitPrice = new { type = "NUMBER" }
                                },
                                required = new[] { "name", "quantity", "unitPrice" }
                            }
                        }
                    },
                    required = new[] { "serviceCharge", "items" }
                }
            }
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, $"v1beta/models/{Uri.EscapeDataString(model)}:generateContent")
        {
            Content = JsonContent.Create(requestBody)
        };
        request.Headers.Add("x-goog-api-key", apiKey);

        using var response = await httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Gemini receipt parsing failed with status code {(int)response.StatusCode}.");
        }

        await using var responseStream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var responseDocument = await JsonDocument.ParseAsync(responseStream, cancellationToken: cancellationToken);

        var responseText = GetResponseText(responseDocument.RootElement);
        var result = JsonSerializer.Deserialize<ReceiptParseResult>(responseText, JsonOptions);

        if (result is null || result.Items is null)
        {
            throw new InvalidOperationException("Gemini returned an invalid receipt result.");
        }

        return result;
    }

    private static string GetResponseText(JsonElement root)
    {
        if (!root.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0)
        {
            throw new InvalidOperationException("Gemini did not return a receipt result.");
        }

        var parts = candidates[0].GetProperty("content").GetProperty("parts");
        foreach (var part in parts.EnumerateArray())
        {
            if (part.TryGetProperty("text", out var text))
            {
                return text.GetString() ?? throw new InvalidOperationException("Gemini returned an empty receipt result.");
            }
        }

        throw new InvalidOperationException("Gemini returned an empty receipt result.");
    }
}
