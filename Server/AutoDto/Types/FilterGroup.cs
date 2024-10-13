using System.Linq.Expressions;
using AutoDto.Abstractions;
using AutoDto.Enums;
using AutoDto.Extensions;

namespace AutoDto.Types;

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