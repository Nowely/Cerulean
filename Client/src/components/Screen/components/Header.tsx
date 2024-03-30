import {Breadcrumb, Layout} from "antd";

export const Header = () => {
	return (
		<Layout.Header style={{backgroundColor: "inherit", height: 45, paddingInline: 30}}>
			<Breadcrumb style={{margin: '12px 0'}}>
				<Breadcrumb.Item>Home</Breadcrumb.Item>
				<Breadcrumb.Item>List</Breadcrumb.Item>
				<Breadcrumb.Item>App</Breadcrumb.Item>
			</Breadcrumb>
		</Layout.Header>
	)
}