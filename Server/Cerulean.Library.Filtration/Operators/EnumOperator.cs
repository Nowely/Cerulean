using Cerulean.Library.Filtration.Enums;

namespace Cerulean.Library.Filtration.Operators;

//Это любые типы перечислений, когда предоставляется на выбор несколько состояний.
public record EnumOperator<T>(EnumOperatorType Type, T[]? Value);