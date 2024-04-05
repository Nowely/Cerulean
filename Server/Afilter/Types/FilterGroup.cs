using System.Linq.Expressions;
using Afilter.Abstractions;
using Afilter.Enums;
using Afilter.Extensions;

namespace Afilter.Types;

public record FilterGroup<T> : IFilterGroup where T : IFilterModel {
	public CombineType Type { get; set; }
	public required T[] Where { get; set; }

	public Expression? BuildExpressionFor(Type targetType, Expression parameter) =>
		Where
			.Select(filterModel => ExpressionHelper.BuildBody(targetType, filterModel, parameter))
			.OfType<Expression>()
			.Aggregate<Expression?, Expression?>(
				null,
				(current, expression) => expression.Combine(current, Type)
			);
}