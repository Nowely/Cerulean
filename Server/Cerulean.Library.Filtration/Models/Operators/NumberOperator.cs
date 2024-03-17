using Cerulean.Library.Filtration.Enums;

namespace Cerulean.Library.Filtration.Models.Operators;

public record NumberOperator<T>(NumberOperatorType Type, T? Value);