using System.Linq.Expressions;
using System.Text.RegularExpressions;
using Afilter.Enums;
using Afilter.Abstractions;
using static System.Linq.Expressions.Expression;

namespace Afilter.Operators.String;

//TODO pass options
public record StringFilterOption(StringComparison? Comparison, RegexOptions RegexOptions);

public record StringOperator(StringOperatorType Type, string? Value = null) : IFilterOperator {
	private Expression Filter => Property(Expression.Constant(this), nameof(Value));

	public Expression? BuildExpressionFor(MemberExpression target) =>
		Type switch {
			StringOperatorType.Is => Is(target, Filter),
			StringOperatorType.IsNot => Not(Is(target, Filter)),

			StringOperatorType.IsEmpty => IsEmpty(target),
			StringOperatorType.IsNotEmpty => Not(IsEmpty(target)),

			StringOperatorType.Contains => Contains(target, Filter),
			StringOperatorType.NotContains => Not(Contains(target, Filter)),

			StringOperatorType.StartsWith => StartsWith(target, Filter),
			StringOperatorType.NotStartsWith => Not(StartsWith(target, Filter)),

			StringOperatorType.EndsWith => EndsWith(target, Filter),
			StringOperatorType.NotEndsWith => Not(EndsWith(target, Filter)),

			StringOperatorType.IsMatch => IsMatch(target, Filter),
			StringOperatorType.IsNotMatch => Not(IsMatch(target, Filter)),

			_ => null
		};

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