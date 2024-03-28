using Tools.Filtration.Enums;

namespace Tools.Filtration.Models.Operators;

//Это любые типы перечислений, когда предоставляется на выбор несколько состояний.
public record EnumOperator<T>(EnumOperatorType Type, T[]? Value);