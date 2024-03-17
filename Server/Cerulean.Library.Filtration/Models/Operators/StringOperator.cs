using System.Linq.Expressions;
using Cerulean.Library.Filtration.Enums;
using AutoFilterer.Abstractions;
using AutoFilterer.Attributes;
using Cerulean.Library.Filtration.AutoFilterer;

namespace Cerulean.Library.Filtration.Models.Operators;

public record StringOperator(StringOperatorType Type, string? Value): IFilterableType {
	public Expression BuildExpression(ExpressionBuildContext context) {
		return Type switch {
			StringOperatorType.Is => OperatorComparisonAttribute.Equal.BuildExpression(
				ContextFor(context, "Value", Value)
				),
			StringOperatorType.IsNot => OperatorComparisonAttribute.NotEqual.BuildExpression(
				ContextFor(context, nameof(StringOperatorType.IsNot), Value)
				),
			StringOperatorType.IsEmpty => OperatorComparisonAttribute.IsNull.BuildExpression(
				ContextFor(context, nameof(StringOperatorType.IsEmpty), null)
				),
			StringOperatorType.IsNotEmpty => OperatorComparisonAttribute.IsNotNull.BuildExpression(
				ContextFor(context, nameof(StringOperatorType.IsNotEmpty), null)
				),
			_ => null
		};

		/*if (Type == StringOperatorType.Is)
			expression =
				new StringFilterOptionsAttribute(StringFilterOption.Equals) { Comparison = Compare }.BuildExpression(
					ContextFor(context, nameof(Equals), Equals));

		if (Type == StringOperatorType.Contains)
			expression =
				new StringFilterOptionsAttribute(StringFilterOption.Contains) { Comparison = Compare }.BuildExpression(
					ContextFor(context, nameof(Contains), Contains));

		if (Type == StringOperatorType.NotContains)
			expression = Expression.Not(new StringFilterOptionsAttribute(StringFilterOption.Contains) { Comparison = Compare }.BuildExpression(ContextFor(context, nameof(NotContains), NotContains)));

		if (Type == StringOperatorType.StartsWith)
			expression = new StringFilterOptionsAttribute(StringFilterOption.StartsWith) { Comparison = Compare }.BuildExpression(ContextFor(context, nameof(StartsWith), StartsWith));

		if (Type == StringOperatorType.EndsWith)
			expression = new StringFilterOptionsAttribute(StringFilterOption.EndsWith) { Comparison = Compare }.BuildExpression(ContextFor(context, nameof(EndsWith), EndsWith));*/

		//if (NotStartsWith != null)
		//  expression = expression.Combine(Expression.Not(new StringFilterOptionsAttribute(StringFilterOption.StartsWith) { Comparison = Compare }.BuildExpression(ContextFor(context, nameof(NotStartsWith), NotStartsWith))), CombineWith);

		//if (NotEndsWith != null)
          //  expression = expression.Combine(Expression.Not(new StringFilterOptionsAttribute(StringFilterOption.EndsWith) { Comparison = Compare }.BuildExpression(ContextFor(context, nameof(NotEndsWith), NotEndsWith))), CombineWith);
	}

    private ExpressionBuildContext ContextFor(ExpressionBuildContext originalContext, string propertyName, string value)
    {
        var innerProperty = originalContext.FilterProperty.PropertyType.GetProperty(propertyName);
        var innerPropertyExpression = Expression.Property(originalContext.FilterPropertyExpression, innerProperty);

        return new ExpressionBuildContext(
            originalContext.ExpressionBody,
            originalContext.TargetProperty,
            innerProperty,
            innerPropertyExpression,
            originalContext.FilterObject,
            value);
    }

    private ExpressionBuildContext ContextForConstant(ExpressionBuildContext originalContext, string value)
    {
        return new ExpressionBuildContext(
            originalContext.ExpressionBody,
            originalContext.TargetProperty,
            null,
            Expression.Constant(value),
            originalContext.FilterObject,
            value);
    }
}