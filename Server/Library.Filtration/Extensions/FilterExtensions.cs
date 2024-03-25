using System.Linq.Expressions;
using AutoFilterer;
using AutoFilterer.Attributes;
using AutoFilterer.Extensions;
using Library.Filtration.AutoFilterer;
using Library.Filtration.AutoFilterer.Types;

namespace Library.Filtration.Extensions;

public static class FilterExtensions {
	public static IQueryable<TEntity> ApplyMyFilter<TEntity>(IQueryable<TEntity> query, IMyFilter filter) {
		var parameter = Expression.Parameter(typeof(TEntity), "x");

		var body = BuildBodyExpression(typeof(TEntity), parameter, filter);

		if (body is MemberExpression or ParameterExpression) return query;

		var lambda = Expression.Lambda<Func<TEntity, bool>>(body, parameter);
		return query.Where(lambda);
	}

	private static Expression BuildBodyExpression(Type entityType, Expression body, IMyFilter filter) {
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