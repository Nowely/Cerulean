using Library.Filtration.Enums;

namespace Library.Filtration.Models;

public record FilterGroup<T> {
	public CombineType Type { get; set; }
	public required T[] Where { get; set; }
}