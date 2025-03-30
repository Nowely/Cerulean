using System.Diagnostics.CodeAnalysis;
using Microsoft.AspNetCore.Mvc;

public class SearchRequest {
	public string? Query { get; set; }
	public int Page { get; set; }
	public int PageSize { get; set; }

	[FromQuery]
	public required Search Search { get; set; }
}

public class Search : IParsable<Search>{
	public required string Name { get; set; }

	public int Type { get; set; }

	public static Search Parse(string s, IFormatProvider? provider) {
		throw new NotImplementedException();
	}

	public static bool TryParse([NotNullWhen(true)] string? s, IFormatProvider? provider, [MaybeNullWhen(false)] out Search result) {
		Console.WriteLine(s);
		throw new NotImplementedException();
	}
}