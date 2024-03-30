using System.Linq.Expressions;
using System.Text.RegularExpressions;
using Afftration.Abstractions;
using Afftration.Enums;
using static System.Linq.Expressions.Expression;

namespace Afftration.Operators.String;

//TODO pass options
public record StringFilterOption(StringComparison? Comparison, RegexOptions RegexOptions);

public record StringOperator(StringOperatorType Type, string? Value = null) : IFilterOperator {
	public Expression? BuildExpressionFor(MemberExpression target) {
		var filter = Property(Expression.Constant(this), nameof(Value));

		return Type switch {
			StringOperatorType.Is => Is(target, filter),
			StringOperatorType.IsNot => Not(Is(target, filter)),

			StringOperatorType.IsEmpty => IsEmpty(target),
			StringOperatorType.IsNotEmpty => Not(IsEmpty(target)),

			StringOperatorType.Contains => Contains(target, filter),
			StringOperatorType.NotContains => Not(Contains(target, filter)),

			StringOperatorType.StartsWith => StartsWith(target, filter),
			StringOperatorType.NotStartsWith => Not(StartsWith(target, filter)),

			StringOperatorType.EndsWith => EndsWith(target, filter),
			StringOperatorType.NotEndsWith => Not(EndsWith(target, filter)),

			StringOperatorType.IsMatch => IsMatch(target, filter),
			StringOperatorType.IsNotMatch => Not(IsMatch(target, filter)),

			_ => null
		};
	}

	private static BinaryExpression Is(Expression target, Expression filter) =>
		MakeBinary(ExpressionType.Equal, target, filter);

	private static MethodCallExpression IsEmpty(Expression target) =>
		Call(typeof(string), nameof(string.IsNullOrWhiteSpace), [], target);

	private static MethodCallExpression Contains(Expression target, Expression filter) =>
		Call(target, nameof(string.Contains), [], filter);

	private static MethodCallExpression StartsWith(Expression target, Expression filter) =>
		Call(target, nameof(string.StartsWith), [], filter);

	private static MethodCallExpression EndsWith(Expression target, Expression filter) =>
		Call(target, nameof(string.EndsWith), [], filter);

	private static MethodCallExpression IsMatch(Expression target, Expression filter) =>
		Call(typeof(Regex), nameof(Regex.IsMatch), [], target, filter);
}