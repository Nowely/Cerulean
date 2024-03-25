using Library.Filtration.Enums;

namespace Library.Filtration.Models.Operators;

public record NumberOperator<T>(NumberOperatorType Type, T? Value);