using System.Linq.Expressions;
using AutoFilterer;
using AutoFilterer.Attributes;
using AutoFilterer.Extensions;
using Tools.Filtration.AutoFilterer;
using Tools.Filtration.AutoFilterer.Types;

namespace Tools.Filtration.Extensions;

public static class FilterExtensions {
	public static IQueryable<TEntity> ApplyFilter<TEntity>(this IQueryable<TEntity> query, IMyFilter filter) {
		var lambda = BuildLambdaExpression<TEntity>(filter);
		return lambda is null ? query : query.Where(lambda);
	}

	private static Expression<Func<TEntity, bool>>? BuildLambdaExpression<TEntity>(IMyFilter filter) {
		var parameter = Expression.Parameter(typeof(TEntity), "x");
		var body = BuildBodyExpression(typeof(TEntity), parameter, filter);

		if (body is MemberExpression or ParameterExpression) return null;
		//if (body is null) return null;

		return Expression.Lambda<Func<TEntity, bool>>(body, parameter);
	}

	private static Expression? BuildBodyExpression(Type entityType, Expression body, IMyFilter filter) {
		var bodyExpression = body;
		var filterType = filter.GetType();

		foreach (var filterProperty in filterType.GetProperties()) {
			var filterPropertyValue = filterProperty.GetValue(filter);
			var filterPropertyExpression = Expression.Property(Expression.Constant(filter), filterProperty);

			if (filterPropertyValue is null) continue;

			var attribute = new CompareToAttribute(filterProperty.Name);

			var targetProperty = entityType.GetProperty(filterProperty.Name);
			if (targetProperty == null) continue;

			var bodyParameter = bodyExpression is MemberExpression ? bodyExpression : body;

			var context = new ExpressionBuildContext(
				bodyParameter,
				targetProperty,
				filterProperty,
				filterPropertyExpression,
				filter,
				filterPropertyValue
			);
			var expression = attribute.BuildExpressionForProperty(context);

			var combined = bodyExpression.Combine(expression, CombineType.And);
			bodyExpression = combined.Combine(body, CombineType.And);
		}

		return bodyExpression;
	}
}