using System.Linq.Expressions;
using Afilter.Abstractions;
using Afilter.Enums;
using Afilter.Extensions;

namespace Afilter.Types;

public record FilterGroup<T> where T : IFilter {
	public CombineType Type { get; set; }
	public required T[] Where { get; set; }

	public Expression<Func<TEntity, bool>>? BuildLambdaExpression<TEntity, TFilterModel>() {
		var parameter = Expression.Parameter(typeof(TEntity), "x");
		var body = BuildBodyExpression(typeof(TEntity), parameter);

		return body is null ? null : Expression.Lambda<Func<TEntity, bool>>(body, parameter);
	}

	public Expression? BuildBodyExpression(Type targetType, Expression parameter) {
		return Where
			   .Select(filterModel => ExpressionHelper.BuildBody(targetType, filterModel, parameter))
			   .OfType<Expression>()
			   .Aggregate<Expression?, Expression?>(
				   null,
				   (current, expression) => expression.Combine(current, Type)
			   );
	}
}