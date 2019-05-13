'use strict';

proySymphony.service('tooltipsService', function($rootScope) {

    var service = {
        tips: {}
    };

    service.tips.billing = {
        defaultpayment: 'Default payment method',
        setdefaultpayment: 'Set as default payment method',
        edit_card: 'Edit the expiry for this card',
        cancel_edit_card: 'Cancel editing',
        save_card_changes: 'Save changes to this payment method',
        remove_card: 'Remove this payment method',
        add_new_card: 'Add a new credit card',
        add_new_bank_account: 'Connect a bank account',
        delete_invoice: 'Delete this invoice',
        view_invoice: 'View / Download this invoice',
        edit_invoice: 'Edit this invoice',
        cancel_edit_line: 'Cancel editing line',
        save_line: 'Save changes to line',
        delete_line: 'Delete line',
        delete_credit: 'Delete credit activity item',
        refund: 'Issue a full or partial refund',
        cancel_invoice: 'Cancel invoice',
        refund_details: 'Show refund details'
    };
    service.tips.autoattendant = {
        holidaysavechanges: 'Save Changes to Holiday',
        holidayremoverecord: 'Remove Holiday',
        holidayeditrecord: 'Edit Holiday',
        holidaycancelediting: 'Cancel Editing Holiday',
        editattendant: 'Edit This Attendant',
        cloneattendant: 'Clone This Attendant',
        deleteattendant: 'Delete This Attendant',
        schedulestatus: 'Has the schedule been populated?',
        menuoptionsstatus: 'Have the menu options been created?',
        greetingstatus: 'Has the attendant greeting been set?',
        voicemailstatus: 'Has the voicemail been configured for the number?',
        changerespondsto: 'Change the Responds To number for the attendant',
        editringgroup: 'Edit This Ring Group',
        cloneringgroup: 'Clone This Ring Group',
        deleteringgroup: 'Delete This Ring Group',
        restartringgroup: 'Restart This Ring Group',
        ordernewsecondary: 'Order a new number',
        savenewsecondary: 'Save new secondary number',
        cancelnewsecondary: 'Cancel new secondary number',
        deletesecondary: 'Delete secondary number',
        playcurrentvoicemailgreeting: 'Play the current voicemail greeting',
        editvoicemailoptions: 'Open voicemail tab to edit forward email and set a greeting',
        editdid: 'Edit primary did for managed AA',
        canceldidedit: 'Cancel editing primary did',
        savedid: 'Save changes to primary did',
        savelocation: 'Save changes to location',
        editlocation: 'Edit location for managed AA',
        cancellocationedit: 'Cancel editing location'
    };
    service.tips.numberporting = {
        canceladdon: 'Cancel this Addon',
        deletedid: 'Delete Did',
        cancelport: 'Cancel Number Porting',
        porting: 'Click to set porting to completed',
        sortbyactiveusers: 'Sort by number of active users',
        sortbycode: 'Sort by Group Code',
        sortbypackage: 'Sort by Package',
        sortbydomain: 'Sort by domain name',
        sortbycompany: 'Sort by company name',
        sortbydate: 'Sort by creation date',
        sortbycodestatus: 'Sort by code status',
        sortbycodetype: 'Sort by code type',
        sortbynumber: 'Sort by number',
        sortbynumbertype: 'Sort by number type',
        sortbyportstatus: 'Sort by port status',
        sortbystatus: 'Sort by number status',
        deleteringgroup: 'Delete This Ring Group',
        restartringgroup: 'Restart This Ring Group'
    };
    service.tips.number_setup = {
        edittollfree: 'Edit this toll free number',
        canceltollfree: 'Cancel this toll free number'
    };
    service.tips.contacts = {
        playringtone: 'Play Ringtone',
        stopringtone: 'Stop Ringtone',
        removeringtone: 'Remove Ringtone From Contact',
        contact_name_prefix: 'Contact Name Prefix',
        contact_name_given: 'Contact Given Name',
        contact_name_family: 'Contact Family Name',
        contact_name_suffix: 'Contact Name Suffix',
        contact_email_address: 'Contact Email Address',
        contact_organization: 'Contact Organization',
        contact_title: 'Contact Job Title',
        contact_nickname: 'Contact Nickname',
        contact_time_zone: 'Choose a Time Zone',
        contact_type: 'Specify a Contact Type',
        contact_category: 'Specify if Contact is Flagged as a Favorite',
        phone_label: 'Phone Label',
        phone_number: 'Phone Number',
        phone_extension: 'Phone Extension',
        phone_type_voice: 'Use for Voice',
        phone_type_fax: 'Use for Fax',
        phone_type_text: 'Use for SMS Text',
        phone_type_video: 'Use for Video',
        add_phone_line: 'Add another Phone Line',
        contact_notes: 'Submit notes about this contact ...',
        addcontact: 'Add to Contacts',
        callcontact: 'Call Contact'
    };

    service.tips.contactselect = {
        clearfield: 'Click to clear this search',
        selectnumber: 'Select this number',
        selectemail: 'Select this email'
    };

    service.tips.vfax = {
        viewfax: 'View Preview of the Fax',
        downloadfax: 'Download a copy of the Fax',
        resend: 'Resend Fax to Original Recipient',
        faxcalleridname: 'This name will appear as the caller id for outbound faxes',
        faxemailaddress: 'A copy of inbound faxes will be delivered to this address',
        inbound: 'Inbound fax',
        outbound: 'Outbound fax',
        sortbysourcenumber: 'Sort faxes by Source Number',
        sortbydestnumber: 'Sort faxes by Destination Number',
        sortbysentat: 'Sort faxes by Sent Date',
        sortbyfile: 'Sort faxes by File Name',
        sortbydirection: 'Sort faxes by Direction',
        sortbystatus: 'Sort faxes by Delivery Status',
        swapfaxnumbers: 'Location selected below will be assigned the chosen Agency Fax Number. \nIf another location is using that number, the Fax Numbers for those locations will be swapped. \nTo Assign a brand new number, port one in then assign it here.',
        activeFaxLocations: 'Only locations for which Faxing is enabled are shown here.',
        activeFaxNumbers: 'Only Agency Fax enabled DIDs are shown here.',
        emailtofax: 'Emails sent to this address are converted to a fax sent to the recipient (DID) in the subject after [Fax]',
        userauthemail: 'Your user email address is automatically approved to use send an email to the email to fax address',
        domainauthemail: 'The configurable email address your agency admin has approved to send an email to the email to fax address',
        editdomainauthemail: 'Edit the domain authorized email to fax sender',
        editforwardemail: 'Edit the emails to which all inbound faxes are sent',
        editcalleridname: 'Edit the caller id name that is included in the header of outbound faxes',
        savechanges: 'Save Changes'
    };

    service.tips.adv = {
        conference: 'Click to work with Conference Calls',
        callcenter: 'Click to open the Call Center',
        screenshare: 'Click to open Screen Sharing',
        videocalls: 'Click to open Video Calling',
        fileshare: 'Click to open File Sharing',
        fax: 'Click to open Faxing',
        automated: 'Click to open Automated Marketing',
        cloudstorage: 'Click to open Cloud Storage',
        callrecording: 'Click to open Call Recording'
    };

    service.tips.chat = {
        leave_direct_message: 'Hide this Direct Message channel',
        create_channel: 'Create a new Channel',
        create_direct_message: 'Open a Direct Message ...'
    };

    service.tips.requestfiles = {
        editlink: 'Edit link options',
        removelink: 'Remove link',
        copylink: 'Copy link to clipboard',
        emaillink: 'Send link to an Email Address',
        accessexpiry: 'Link will be active for this period of time'
    };

    service.tips.storeandshare = {
        search: 'Search you cloud files',
        sharefiles: 'Share file(s) with your contact(s)',
        close_search: 'Close Search Results',
        jump_to_result: 'Go To Result',
        submit_search: 'Search for a file or folder matching a string',
        cancelupload: 'Cancel this upload'
    };

    service.tips.automated = {
        schedule_start_date: 'Start Date for Campaign Message',
        schedule_description: 'Descriptor for Campaign Message',
        schedule_start_time: 'Start Time for Campaign Message',
        save_schedule: 'Save changes to this Campaign Message',
        remove_schedule: 'Remove this Message from the Campaign',
        add_schedule: 'Add New Campaign Message',
        schedule_ready: 'Required fields are complete for this message',
        schedule_notready: 'Some required fields are missing for this message',
        show_details: 'Show configuration details for this message',
        sortbyemailaddress: 'Sort by Email Address',
        sortbyname: 'Sort by Name',
        sortbyfirstname: 'Sort by First Name',
        sortbylastname: 'Sort by Last Name',
        sortbyphonenumber: 'Sort by Phone Number',
        sortbydeliverystatus: 'Sort by Delivery Status',
        sortbyinteraction: 'Sort by Recipient Response',
        removecontact: 'Remove this recipient from the campaign',
        editcontact: 'Edit this recipient\'s information',
        canceleditcontact: 'Cancel editing this recipient',
        savecontact: 'Save changes to this recipient',
        importxlsx: 'Import an xlsx, xls, or ods file',
        insertshortcodesms: 'Insert shortcode into sms message',
        insertshortcodeemail: 'Insert shortcode into email message',
        importcsv: 'Import a .csv file with recipient information',
        message_not_ready: 'Details are still needed for this message before the campaign can be started.',
        message_ready: 'All required details are complete for this message.'
    };

    service.tips.integration = {
        resetselection: 'Clear selected contact(s)'
    };

    service.tips.fileshare = {
        resendfileshare: 'Resend download link',
        sendanemail: 'Send an email to ',
        downloadfile: 'Download a copy of the file',
        share_expired: 'This link has expired',
        select_months: 'Choose the Month to Display',
        select_years: 'Choose the Year to Display',
        show_specified_month: 'Display File Shares for the Specified Month & Year',
        selectyearandmonth: 'Please select a month and year to View',
        sortbydownloaded: 'Sort Results by Time Downloaded',
        sortbyrecipientemail: 'Sort Results by Recipient Email Address',
        sortbydate: 'Sort Results by Date Share Sent',
        sortbyfilename: 'Sort Results by Filename',
        sortbyfrom: 'Sort Results by Caller Name',
        sortbydate2: 'Sort Results by Call Date / Time',
        sortbyduration: 'Sort Results by Length of Call',
        sortbystatus: 'Sort Results by Call Status',
        sortbyrecording: 'Sort Results by Recording',
        clear_limit: 'Show all dates',
        copytohawksoft: 'Export File Share Record to HawkSoft Inbox',
        copytomanagement: 'Export File Share Record to Management System Inbox'
    };

    service.tips.analytics = {
        backtocharts: 'Go back to Analytics Charts',
        exporttocsvsms: 'Export messages to csv',
        exporttocsvcalls: 'Export calls to csv'
    };

    service.tips.conversation = {
        copytohawksoft: 'Export communications to HawkSoft Inbox',
        copytomanagement: 'Export communications to Management System Inbox'
    };

    service.tips.callcenter = {
        sortbywith: 'Sort Results by Caller Name',
        sortbyextension: 'Sort Results by Staff Extension',
        sortbyduration: 'Sort Results by Length of Call',
        sortbystatus: 'Sort Results by Staff Status',
        sortbystaff: 'Sort Results by Staff Name',
        sortbygroup: 'Sort Results by Staff Group',
        sortbydirection: 'Sort Results by Call Direction',
        listen: 'Listen to Call',
        whisper: 'Whisper on Call to Staff',
        barge: 'Join the Call'
    };

    service.tips.sortby = {
        sortbyextension: 'Sort Results by Staff Extension',
        sortbyfirstname: 'Sort Results by First Name',
        sortbylastname: 'Sort Results by Last Name',
        sortbydid: 'Sort Results by DID Number',
        sortbyemail: 'Sort Results by Email Address'
    }

    service.tips.history = {
        missed: 'Missed Call',
        voicemail: 'Voicemail Left - Play',
        outboundunanswered: 'Outbound Unanswered Call',
        outboundanswered: 'Outbound Answered Call',
        sent_to_voicemail: 'Sent to voicemail - No message left',
        declined: 'Inbound Declined Call',
        answered: 'Inbound Answered Call',
        sortbyfrom: 'Sort Results by Caller Name',
        sortbydate: 'Sort Results by Call Date / Time',
        sortbyduration: 'Sort Results by Length of Call',
        sortbystatus: 'Sort Results by Call Status',
        sortbyrecording: 'Sort Results by Recording',
        copytohawksoft: 'Export call receipt to HawkSoft Inbox',
        copytomanagement: 'Export call receipt to Management System Inbox'
    };

    service.tips.leftbar = {
        manage_groups: 'Manage contact groups',
        add_contact: 'Add contact',
        import_contacts: 'Import contacts',
        videocall_disabled: 'You need to activate Video Calling',
        videocall_active: 'start video call',
        recent_contacts: 'Show recent contacts',
        show_all_contacts: 'View all contacts',
        show_favorite_contacts: 'Show only your favorite contacts',
        view_communications: 'Search all communications with contact'
    };

    service.tips.calls = {
        makecall: 'Call ',
        dissolve_group: 'Dissolve the Group',

        manage_members: 'Manage Members',
        show_members: 'Show all Members in Group',
        hide_members: 'Hide Group Members',
        remove_member: 'Remove Member From Group',

        manage_managers: 'Manage Managers',
        show_managers: 'Show all Managers in Group',
        hide_managers: 'Hide Group Managers',
        remove_manager: 'Remove Manager From Group',

        manage_viewers: 'Manage Group Access',
        show_viewers: 'Show all Group Access',
        hide_viewers: 'Hide Group Access',
        remove_member2: 'Remove From Group Access',
        edit_group: 'Edit Group Information'
    };

    service.tips.groups = {
        edit_group_name: 'Edit Group Name',
        dissolve_group: 'Dissolve the Group',

        manage_members: 'Manage Members',
        show_members: 'Show all Members in Group',
        hide_members: 'Hide Group Members',
        remove_member: 'Remove Member From Group',

        manage_managers: 'Manage Managers',
        show_managers: 'Show all Managers in Group',
        hide_managers: 'Hide Group Managers',
        remove_manager: 'Remove Manager From Group',

        manage_viewers: 'Manage Group Access',
        show_viewers: 'Show all Group Access',
        hide_viewers: 'Hide Group Access',
        remove_member2: 'Remove From Group Access',
        remove_viewer_group: 'Remove Viewer Group from Group',
        remove_viewer_user: 'Remove Viewer User from Group',
        edit_group: 'Edit Group Information'
    };

    service.tips.chatplus = {
        close_search: 'Close Search Results',
        jump_to_result: 'Go To Result in Channel',
        submit_search: 'Search for a word or phrase in Chat Messages, avoid using common words (e.g., when, because, was, etc.)',
        show_actions: 'Show message actions ...',
        share_message: 'Share message ...',
        manage_channel: 'Manage Channel Preferences',
        remove_temp_upload: 'Remove File from Upload List',
        upload_files_to_channel: 'Upload Files to Channel',
        max_amount_of_files: 'Only 5 files are allowed per post',
        download_file: 'Download File',
        toggle_hawksoft_copy: 'Select Messages to Export to HawkSoft Inbox',
        toggle_generic_export: 'Select Messages to Export to Management System Inbox',
        copy_to_management: 'Send Messages to Management System Inbox',
        copy_to_hawksoft: 'Send Messages to HawkSoft Inbox',
        adminsubscription: 'You are the channel admin so you can not leave this channel. You need to transfer admin to another team member first or delete the channel.'
    };

    service.tips.sms = {
        delete_thread: 'Remove this thread and all of its messages',
        delete_message: 'Remove this message from the thread',
        copy_message: 'Copy message to your clipboard',
        handled: 'Flag this message as handled by yourself',
        unhandle: 'Mark this message as unhandled',
        forward_message: 'Forward a copy of this message to someone',
        assign_messages: 'Assign text messages',
        assign_copied_texts: 'Assign selected messages',
        toggle_hawksoft_copy: 'Select Messages to Export to HawkSoft Inbox',
        copy_to_hawksoft: 'Send Messages to HawkSoft Inbox',
        toggle_generic_copy: 'Select Messages to Export to Management System Inbox',
        copy_to_management: 'Send Messages to Management System Inbox',
        cancel_copy_sms: 'Cancel Copy Mode',
        cancel_assign_sms: 'Cancel Assign Mode',
        recipient_confirmation: 'Hit Enter or Tab to confirm recipient data',
        add_media: 'Upload Image(s) to send MMS message',
        blacklist: 'Blacklist sender phone number',
        save_blacklist: 'Add number to sms blacklist',
        new_blacklist: 'Add a new number to the sms blacklist',
        cancel_blacklist_add: 'Cancel adding number to blacklist',
        remove_from_blacklist: 'Remove number from blacklist',
        manage_blacklist: 'Manage blacklisted numbers',
        sortbycontact: 'Sort by Contact Name / Number',
        sortbyunread: 'Sort by Unread Message Count',
        sortbymostrecent: 'Sort by Most Recent Message Received',
        close_search: 'Close Search Results',
        jump_to_result: 'Go To Result in Conversation',
        submit_search: 'Search for a word or phrase in SMS Texting'
    };

    service.tips.recording = {
        copytohawksoft: 'Export this recording to HawkSoft Inbox',
        copytomanagement: 'Export this recording to Management System Inbox',
        playmanualrecording: 'Play this recording',
        playautorecording: 'Play this auto recording',
        downloadauto: 'Download the auto recording',
        downloadmanual: 'Download this recording',
        remove: 'Remove this recording'
    };

    service.tips.voicemail = {
        playvoicemail: 'Play Voicemail Recording',
        stopvoicemail: 'Stop Voicemail Recording',
        copytohawksoft: 'Export Voicemail Recording to HawkSoft Inbox',
        copytomanagement: 'Export Voicemail Recording to Management System Inbox',
        remove: 'Remove voicemail recording',
        handled: 'Mark this voicemail as handled by yourself',
        unhandle: 'Mark this voicemail as unhandled',
        assign: 'Assign Voicemail Recording'
    };

    service.tips.companysetup = {
        deletedemouser: 'Delete Demo User'
    };

    service.tips.signup = {
        groupcode: 'Some affiliate groups distribute group codes. This is not required and can be added later by contacting support@kotter.net.',
        e911service: 'This can be customized for more locations later.',
        copytohawksoft: 'Export Voicemail Recording to HawkSoft Inbox',
        copytomanagement: 'Export Voicemail Recording to Management System Inbox',
        remove: 'Remove voicemail recording'
    };

    service.tips.videoconference = {
        roomsuccess: 'Room name saved',
        resetadminlink: 'Reset Conference Administrator Link',
        sendanemail: 'Send Email to',
        disableinvitation: 'Rescind Invitation (Disables Invite Code)',
        resendinvitation: 'Resend Invitation Link to ',
        joinconference: 'Open New Window and Start the Conference',
        playrecording: 'Play video conference recording',
        copytohawksoft: 'Export video conference recording to HawkSoft Inbox',
        copytomanagement: 'Export video conference recording to Management System Inbox',
        remove: 'Remove video conference recording'
    };

    service.tips.conferencecalls = {
        muteall: 'Mute everyone',
        unmuteall: 'Unmute everyone',
    };

    service.tips.forwarding = {
        strategy: 'Specify how the destinations are to be attempted',
        savedest: 'Save this destination',
        deletedest: 'Delete this destination',
        canceldest: 'Cancel adding this destination',
        editdest: 'Edit this destination',
        canceleditdest: 'Cancel editing this destination'
    };

    service.tips.screenshare = {
        playrecording: 'Play Screen Share recording',
        copytohawksoft: 'Export Screen Share recording to HawkSoft Inbox',
        copytomanagement: 'Export Screen Share recording to Management System Inbox',
        remove: 'Remove Screen Share recording'
    };

    $rootScope.tips = service.tips;

    return service;
});
