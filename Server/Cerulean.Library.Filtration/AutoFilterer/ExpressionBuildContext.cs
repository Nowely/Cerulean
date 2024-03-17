using System.Linq.Expressions;
using System.Reflection;
using Cerulean.Library.Filtration.AutoFilterer.Types;

namespace Cerulean.Library.Filtration.AutoFilterer;

public class ExpressionBuildContext(
	Expression expressionBody,
	PropertyInfo targetProperty,
	PropertyInfo filterProperty,
	Expression filterPropertyExpression,
	IMyFilter filterObject,
	object propertyValue
) {
	public Expression ExpressionBody { get; } = expressionBody;

	public PropertyInfo TargetProperty { get; } = targetProperty;

	public PropertyInfo FilterProperty { get; } = filterProperty;

	public Expression FilterPropertyExpression { get; } = filterPropertyExpression;

	public IMyFilter FilterObject { get; } = filterObject;

	public object FilterObjectPropertyValue { get; } = propertyValue;
}