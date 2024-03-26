using Tools.Filtration.Enums;

namespace Tools.Filtration.Models.Operators;

public record NumberOperator<T>(NumberOperatorType Type, T? Value);