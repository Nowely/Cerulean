import React, {ReactNode} from "react";
import {Button, Layout} from "antd";
import {Routes} from "react-router-dom";
import {Sidebar} from "./components/Sidebar";
import {Header} from "./components/Header";
import {PlusOutlined} from "@ant-design/icons";

const {Content} = Layout;

export const Screen = ({children}: { children: ReactNode }) => {
	return (
		<Layout>
			<Sidebar/>
			<Layout style={{backgroundColor: 'white'}}>
				<Header/>
				<Content style={{
					padding: 40,
					margin: 0,
				}}>
					<Routes>
						{children}
					</Routes>
				</Content>
			</Layout>
		</Layout>
	)
}

Screen.displayName = Screen.name

