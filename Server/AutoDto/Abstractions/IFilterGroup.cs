using System.Linq.Expressions;

namespace AutoDto.Abstractions;

public interface IFilterGroup {
	Expression? BuildExpressionFor(Type targetType, Expression parameter);
}