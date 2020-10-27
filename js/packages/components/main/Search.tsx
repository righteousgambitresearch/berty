import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
	Keyboard,
	ScrollView,
	SectionList,
	TextInput,
	TouchableHighlight,
	View,
	Text as TextNative,
} from 'react-native'
import { EdgeInsets, SafeAreaConsumer } from 'react-native-safe-area-context'
import { Icon, Layout, Text } from '@ui-kitten/components'
import { CommonActions, useIsFocused } from '@react-navigation/native'
import LinearGradient from 'react-native-linear-gradient'
import pickBy from 'lodash/pickBy'

import { Routes, useNavigation } from '@berty-tech/navigation'
import { useStyles } from '@berty-tech/styles'
import {
	useMsgrContext,
	useConversation,
	useContact,
	useSortedConvInteractions,
} from '@berty-tech/store/hooks'
import { messenger as messengerpb } from '@berty-tech/api/index.js'
import * as api from '@berty-tech/api/index.pb'

import { ProceduralCircleAvatar } from '../shared-components/ProceduralCircleAvatar'
import { SwipeHelperReactNavTabBar } from '../shared-components/SwipeNavRecognizer'
import messengerMethodsHooks from '@berty-tech/store/methods'
import { pbDateToNum, timeFormat } from '../helpers'

// Styles

const _landingIconSize = 45

const _resultAvatarSize = 45

const _searchBarIconSize = 25

const _approxFooterHeight = 90

const useStylesSearch = () => {
	const [{ flex, text, background, opacity, margin }, { fontScale }] = useStyles()

	return {
		searchResultHighlightText: [
			text.size.small,
			text.color.yellow,
			background.light.yellow,
			text.bold.medium,
		],
		nameHighlightText: [text.color.yellow, background.light.yellow, text.bold.medium],
		plainMessageText: [text.size.small, text.color.grey],
		searchHintBodyText: [
			text.align.center,
			text.color.light.yellow,
			text.size.medium,
			text.bold.small,
			opacity(0.8),
			margin.top.medium,
			margin.bottom.large,
			{ fontFamily: 'Open Sans', lineHeight: 30 * fontScale },
		],
		searchTitleText: [
			text.size.big,
			text.bold.medium,
			text.color.white,
			text.align.center,
			flex.align.center,
			flex.justify.center,
			{
				flexShrink: 0,
				flexGrow: 1,
			},
		],
		searchTitleWrapper: [
			flex.direction.row,
			flex.justify.center,
			flex.align.center,
			{
				marginLeft: 30,
			},
		],
	}
}

// Components

//

const SearchTitle: React.FC<{}> = () => {
	const [{ color }] = useStyles()
	const { searchTitleText, searchTitleWrapper } = useStylesSearch()
	const { dispatch } = useNavigation()
	return (
		<View style={searchTitleWrapper}>
			<Text style={searchTitleText}>Search</Text>
			<Icon
				style={[
					{
						flexShrink: 0,
						flexGrow: 0,
					},
				]}
				name='arrow-forward-outline'
				width={30}
				height={30}
				fill={color.white}
				onPress={() => dispatch(CommonActions.navigate(Routes.Main.Home))}
			/>
		</View>
	)
}

const initialSearchText = ''

const SearchBar: React.FC<{
	onChange: (text: string) => void
	searchText: string
}> = ({ onChange, searchText }) => {
	const [{ row, color, background, text, margin, padding }, { scaleSize }] = useStyles()
	const inputRef: any = useRef(null)
	const onClear = (): void => {
		onChange('')
		Keyboard.dismiss()
	}

	const isFocusedSearchScreen = useIsFocused()

	useEffect(() => {
		isFocusedSearchScreen && inputRef?.current?.focus()
	}, [isFocusedSearchScreen])

	return (
		<ScrollView
			contentContainerStyle={[row.left, { alignItems: 'center' }]}
			keyboardShouldPersistTaps='handled'
		>
			<Icon
				name='search'
				width={_searchBarIconSize * scaleSize}
				height={_searchBarIconSize * scaleSize}
				fill={color.yellow}
			/>
			<TextInput
				onChangeText={onChange}
				placeholder='Search'
				placeholderTextColor={color.yellow}
				style={[
					{ flex: 2 },
					padding.scale(4),
					margin.left.scale(10),
					background.light.yellow,
					text.color.yellow,
				]}
				autoCorrect={false}
				autoCapitalize='none'
				value={searchText}
				ref={inputRef}
			/>
			{searchText.length > 0 && (
				<Icon
					name='close-circle-outline'
					width={_searchBarIconSize * scaleSize}
					height={_searchBarIconSize * scaleSize}
					fill={color.yellow}
					onPress={onClear}
					style={[{ marginLeft: 'auto' }]}
				/>
			)}
		</ScrollView>
	)
}

const SearchHintReadyBody: React.FC<any> = ({ bannerQuote = {} }) => {
	const [{ opacity, row, text }, { scaleSize }] = useStyles()
	const { searchHintBodyText } = useStylesSearch()
	return !bannerQuote?.quote ? null : (
		<View>
			<TextNative
				style={[
					text.align.center,
					row.item.justify,
					text.color.light.yellow,
					text.size.scale(30),
					opacity(0.8),
					text.bold.medium,
					{
						fontFamily: 'Open Sans',
						marginHorizontal: _landingIconSize * scaleSize, // room for speech bubble icon
					},
				]}
			>
				{'Quote of the day'}
			</TextNative>
			<Icon
				name='quote'
				pack='custom'
				width={_landingIconSize * scaleSize}
				height={_landingIconSize * scaleSize}
				style={[row.item.justify, opacity(0.8), { position: 'absolute', bottom: 20, right: 10 }]}
			/>
			<TextNative style={searchHintBodyText}>{bannerQuote?.quote || ''}</TextNative>
			{bannerQuote?.author && (
				<View style={[{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }]}>
					<TextNative
						style={[
							text.color.light.yellow,
							text.size.medium,
							text.bold.small,
							opacity(0.8),
							{ fontFamily: 'Open Sans' },
						]}
					>
						{'— ' + bannerQuote?.author}
					</TextNative>
				</View>
			)}
		</View>
	)
}

const SearchHintFailBody: React.FC<any> = () => {
	const { searchHintBodyText } = useStylesSearch()
	return <TextNative style={searchHintBodyText}>No results found</TextNative>
}

const SearchHint: React.FC<{
	searchText?: string
	hasResults?: boolean
	bannerQuote?: any
}> = ({ searchText = '', hasResults = false, bannerQuote = {} }) => {
	const [{ margin, column, padding }] = useStyles()

	return (
		<View
			style={[
				column.top,
				padding.horizontal.small,
				margin.bottom.scale(_approxFooterHeight),
				{ position: 'relative', bottom: 40 },
			]}
		>
			{searchText.length > 0 && !hasResults ? (
				<SearchHintFailBody />
			) : (
				<SearchHintReadyBody bannerQuote={bannerQuote} />
			)}
		</View>
	)
}

// SEARCH RESULTS

enum SearchResultKind {
	Contact = 'Contact',
	Conversation = 'Conversation',
	Interaction = 'Interaction',
}

type SearchItemProps = { searchText?: string; data: any; kind: SearchResultKind }

const MessageSearchResult: React.FC<{
	message: string
	searchText: string
	style?: any
	highlightStyle?: any
}> = ({ message, searchText, style, highlightStyle }) => {
	if (typeof message !== 'string' || typeof searchText !== 'string') {
		return null
	}

	const parts = []
	let partsCounter = 0
	let lastStart = 0

	const firstResultIndex = message.indexOf(searchText)
	if (firstResultIndex > 20) {
		message = '...' + message.substr(firstResultIndex - 15)
	}

	for (let i = 0; i < message.length; ) {
		const searchTarget = message.substr(i, searchText.length)
		if (searchTarget.toLowerCase() === searchText.toLowerCase()) {
			if (lastStart < i) {
				const plainPart = message.substr(lastStart, i - lastStart)
				parts[partsCounter] = (
					<Text key={partsCounter} style={style}>
						{plainPart}
					</Text>
				)
				partsCounter++
			}
			parts[partsCounter] = (
				<Text key={partsCounter} style={highlightStyle}>
					{searchTarget}
				</Text>
			)
			partsCounter++
			i += searchText.length
			lastStart = i
		} else {
			i++
		}
	}
	if (lastStart !== message.length) {
		const plainPart = message.substr(lastStart)
		parts[partsCounter] = (
			<Text key={partsCounter} style={style}>
				{plainPart}
			</Text>
		)
		lastStart = message.length
		partsCounter++
	}

	return <>{parts}</>
}

const SearchResultItem: React.FC<SearchItemProps> = ({ data, kind, searchText = '' }) => {
	const [{ color, row, padding, flex, column, text, margin, border }] = useStyles()
	const { plainMessageText, searchResultHighlightText, nameHighlightText } = useStylesSearch()
	const { navigate, dispatch } = useNavigation()

	let convPk: string
	switch (kind) {
		case SearchResultKind.Contact:
			convPk = data.conversationPublicKey || ''
			break
		case SearchResultKind.Conversation:
			convPk = data.publicKey || ''
			break
		case SearchResultKind.Interaction:
			convPk = data.conversationPublicKey || ''
			break
	}
	const conv = useConversation(convPk)

	let contactPk: string
	switch (kind) {
		case SearchResultKind.Contact:
			contactPk = data.publicKey
			break
		case SearchResultKind.Conversation:
			contactPk = ''
			break
		case SearchResultKind.Interaction:
			contactPk = conv?.contactPublicKey
			break
	}
	const contact = useContact(contactPk)

	const interactions = useSortedConvInteractions(conv?.publicKey).filter(
		(inte) => inte.type === messengerpb.AppMessage.Type.TypeUserMessage,
	)
	const lastInteraction =
		interactions && interactions.length > 0 ? interactions[interactions.length - 1] : null

	let name: string
	let inte: api.berty.messenger.v1.IInteraction | null
	let avatarSeed: string
	switch (kind) {
		case SearchResultKind.Contact:
			avatarSeed = data.publicKey
			name = data.displayName || ''
			inte = lastInteraction || null
			break
		case SearchResultKind.Conversation:
			avatarSeed = convPk
			name = data.displayName || ''
			inte = lastInteraction || null
			break
		case SearchResultKind.Interaction:
			if (conv?.type === messengerpb.Conversation.Type.ContactType) {
				name = contact?.displayName || ''
				avatarSeed = contact?.publicKey
			} else {
				name = conv?.displayName || ''
				avatarSeed = convPk
			}
			inte = data || null
			break
		default:
			return null
	}

	const date = pbDateToNum(inte?.sentDate)

	const MessageDisplay = () => {
		let content
		switch (kind) {
			case SearchResultKind.Contact:
				switch (data.state) {
					case messengerpb.Contact.State.IncomingRequest:
						content = '📬 Incoming request'
						break
					case messengerpb.Contact.State.OutgoingRequestEnqueued:
						content = '📪 Outgoing request enqueued'
						break
					case messengerpb.Contact.State.OutgoingRequestSent:
						content = '📫 Outgoing request sent'
						break
					default:
						content = (inte?.payload as any)?.body
				}
				break
			case SearchResultKind.Conversation:
				content = (inte?.payload as any)?.body
				break
			case SearchResultKind.Interaction:
				content = (
					<MessageSearchResult
						searchText={searchText}
						message={(inte?.payload as any)?.body}
						style={plainMessageText}
						highlightStyle={searchResultHighlightText}
					/>
				)
				break
			default:
				return null
		}
		return (
			<Text numberOfLines={1} style={plainMessageText}>
				{content}
			</Text>
		)
	}

	const TimeStamp = () => {
		return (
			<Text style={[padding.left.small, text.size.small, text.color.grey]}>
				{timeFormat.fmtTimestamp1(date)}
			</Text>
		)
	}

	return (
		<TouchableHighlight
			underlayColor={!conv ? 'transparent' : color.light.grey}
			onPress={() =>
				!conv
					? data.state === messengerpb.Contact.State.IncomingRequest
						? navigate.main.contactRequest({ contactId: data.publicKey })
						: dispatch(
								CommonActions.navigate({
									name: Routes.Main.RequestSent,
									params: {
										contactPublicKey: data.publicKey,
									},
								}),
						  )
					: dispatch(
							CommonActions.navigate({
								name:
									conv.type === messengerpb.Conversation.Type.ContactType
										? Routes.Chat.OneToOne
										: Routes.Chat.Group,
								params: {
									convId: convPk,
									scrollToMessage: kind === SearchResultKind.Interaction && inte ? inte.cid : null,
								},
							}),
					  )
			}
		>
			<View style={[row.center, padding.medium, border.bottom.tiny, border.color.light.grey]}>
				<ProceduralCircleAvatar
					seed={avatarSeed}
					size={_resultAvatarSize}
					diffSize={9}
					style={[padding.tiny, row.item.justify]}
				/>
				<View style={[flex.medium, column.justify, padding.left.medium]}>
					<View style={[margin.right.big]}>
						<Text numberOfLines={1} style={[column.item.fill, text.bold.medium]}>
							{kind === SearchResultKind.Interaction ? (
								name
							) : (
								<MessageSearchResult
									message={name}
									searchText={searchText}
									style={[text.bold.medium]}
									highlightStyle={nameHighlightText}
								/>
							)}
						</Text>
						<MessageDisplay />
					</View>
				</View>

				<View style={[{ marginLeft: 'auto' }, row.item.center]}>
					{date > 0 && kind === SearchResultKind.Interaction ? <TimeStamp /> : null}
				</View>
			</View>
		</TouchableHighlight>
	)
}

export const createSections = (
	conversations: any,
	contacts: any,
	interactions: any,
	searchText: string,
) => {
	const sections = [
		{
			title: contacts.length ? 'Contacts' : '',
			data: contacts,
			renderItem: ({ item }: { item: any }) => (
				<SearchResultItem data={item} kind={SearchResultKind.Contact} searchText={searchText} />
			),
		},
		{
			title: conversations.length ? 'Groups' : '',
			data: conversations,
			renderItem: ({ item }: { item: any }) => (
				<SearchResultItem
					data={item}
					kind={SearchResultKind.Conversation}
					searchText={searchText}
				/>
			),
		},
		{
			title: interactions.length ? 'Messages' : '',
			data: interactions,
			renderItem: ({ item }: { item: any }) => (
				<SearchResultItem data={item} kind={SearchResultKind.Interaction} searchText={searchText} />
			),
		},
	]
	return sections
}
