using Afilter.Enums;

namespace Afilter.Operators.Enum;

//Это любые типы перечислений, когда предоставляется на выбор несколько состояний.
public record EnumOperator<T>(EnumOperatorType Type, T[]? Value);