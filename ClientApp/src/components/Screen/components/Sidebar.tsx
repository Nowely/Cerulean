import {Button, Layout, Menu} from "antd";
import React from "react";
import {PlusOutlined} from "@ant-design/icons";
import {css} from "@emotion/css";
import {observer} from "mobx-react";
import {store} from "../../../Stores/Store";

const className = css`
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
  position: relative;
  background-color: #f5f5f5;
`

const cn = css`
  display: block;
  flex-shrink: 0;
  flex-grow: 0;
`

export const Sidebar = observer(() => {

	return (
		<Layout.Sider style={{height: '100vh', backgroundColor: '#f5f5f5'}}>
			<Menu
				mode="inline"
				defaultSelectedKeys={[]}
				defaultOpenKeys={['1']}
				style={{height: '90%', borderRight: 0, backgroundColor: 'inherit'}}
				items={[{
					key: `1`,
					label: `Pages`,
					children: store.pages.data.map(v => ({key: v.id, label: v.title}))
				}]}
			/>
			<Button block type="text" icon={<PlusOutlined/>} style={{flexFlow: "column"}}>
				New Page
			</Button>
		</Layout.Sider>
	)
})