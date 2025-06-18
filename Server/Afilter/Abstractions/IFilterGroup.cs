using System.Linq.Expressions;

namespace Afilter.Abstractions;

public interface IFilterGroup {
	Expression? BuildExpressionFor(Type targetType, Expression parameter);
}