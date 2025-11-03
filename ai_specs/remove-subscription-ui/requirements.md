# Requirements Document

## Introduction

This document outlines the requirements for removing all subscription, Pro membership, and payment-related UI elements from the self-hosted Scira instance. The goal is to eliminate all visual references to paid features while maintaining full application functionality, as this is a self-hosted fork where all features are unlocked and unlimited by default. The backend logic has already been modified to bypass subscription checks, but the UI still displays payment-related elements that need to be removed for a clean self-hosted experience.

## Requirements

### Requirement 1: Remove Subscription Management Section from Settings

**User Story:** As a self-hosted user, I want the settings page to not display any subscription management options, so that I don't see irrelevant payment-related content.

#### Acceptance Criteria

1. WHEN the user navigates to the settings page (/settings) THEN the system SHALL NOT display the "Subscription" tab in the settings navigation
2. WHEN the settings page loads THEN the system SHALL remove the subscription section entirely from both desktop and mobile views
3. IF the URL contains ?tab=subscription THEN the system SHALL redirect to the default settings tab (usage or preferences)
4. WHEN displaying user profile information THEN the system SHALL NOT show Pro badges or subscription status indicators

### Requirement 2: Remove Pro Upgrade Prompts from Connectors

**User Story:** As a self-hosted user, I want to access all connectors without seeing upgrade prompts, so that I can freely connect my services.

#### Acceptance Criteria

1. WHEN viewing the Connectors section in settings THEN the system SHALL NOT display "Upgrade to Pro" buttons or Pro feature blocks
2. IF a connector is not connected THEN the system SHALL only show a "Connect" button without any Pro requirements
3. WHEN all connectors are displayed THEN the system SHALL treat them as fully accessible without subscription checks
4. WHEN the connector beta announcement is shown THEN the system SHALL NOT mention Pro user requirements

### Requirement 3: Remove Pricing Pages and Navigation

**User Story:** As a self-hosted user, I want all pricing-related pages and navigation links removed, so that there are no references to payment options.

#### Acceptance Criteria

1. WHEN accessing /pricing route THEN the system SHALL redirect to the main application (/new)
2. WHEN accessing /checkout route THEN the system SHALL redirect to the main application (/new)
3. WHEN the about page (/about) is displayed THEN the system SHALL NOT show the pricing section
4. WHEN navigation menus are rendered THEN the system SHALL NOT include links to pricing pages
5. IF any component references /pricing in a link THEN the system SHALL either hide that link or redirect to /new

### Requirement 4: Remove Pro Upgrade Screens from Features

**User Story:** As a self-hosted user, I want to access all features directly without seeing upgrade screens, so that I can use the full application immediately.

#### Acceptance Criteria

1. WHEN accessing the Lookout feature (/lookout) THEN the system SHALL NOT display the ProUpgradeScreen component
2. WHEN accessing X/Twitter search (XQL) feature THEN the system SHALL NOT display the XQLProUpgradeScreen component
3. IF a feature check for Pro status occurs in the UI THEN the system SHALL always treat the user as having Pro access
4. WHEN any feature is accessed THEN the system SHALL provide immediate access without upgrade prompts

### Requirement 5: Remove Payment History and Billing Management

**User Story:** As a self-hosted user, I want no references to billing history or payment management, so that the application reflects its self-hosted nature.

#### Acceptance Criteria

1. WHEN the settings page displays user information THEN the system SHALL NOT show billing history sections
2. WHEN user profile data is displayed THEN the system SHALL NOT include payment history or subscription details
3. IF any "Manage Billing" buttons exist THEN the system SHALL remove them completely
4. WHEN the user profile is displayed THEN the system SHALL NOT show expiration warnings or renewal prompts

### Requirement 6: Remove Pro Model Restrictions in UI

**User Story:** As a self-hosted user, I want all AI models to appear as accessible without Pro indicators, so that I can use any model freely.

#### Acceptance Criteria

1. WHEN the model selector is displayed THEN the system SHALL NOT show Pro badges on any models
2. WHEN a model is selected THEN the system SHALL NOT display upgrade requirements or Pro subscription messages
3. IF model validation occurs in the UI THEN the system SHALL always allow selection of any model
4. WHEN model limits are checked THEN the system SHALL NOT display message count restrictions

### Requirement 7: Clean Navigation and User Interface

**User Story:** As a self-hosted user, I want a clean interface without any payment-related UI elements, so that the application feels complete and unlimited.

#### Acceptance Criteria

1. WHEN the main navigation is rendered THEN the system SHALL NOT include pricing, checkout, or subscription links
2. WHEN error messages are displayed THEN the system SHALL NOT mention Pro subscriptions or upgrade requirements
3. IF tooltips or help text reference Pro features THEN the system SHALL remove or modify them to reflect unlimited access
4. WHEN the about page is displayed THEN the system SHALL focus on features and capabilities without pricing information

### Requirement 8: Maintain Full Functionality

**User Story:** As a self-hosted user, I want all features to remain fully functional after UI changes, so that removing payment UI doesn't break any functionality.

#### Acceptance Criteria

1. WHEN subscription UI elements are removed THEN the system SHALL maintain all existing feature functionality
2. WHEN connectors are accessed THEN the system SHALL allow connection, syncing, and disconnection without restrictions
3. WHEN any feature is used THEN the system SHALL NOT encounter errors due to missing subscription UI components
4. IF a component depends on subscription status THEN the system SHALL default to unlimited/Pro behavior

### Requirement 9: Update Success and Confirmation Messages

**User Story:** As a self-hosted user, I want confirmation messages to reflect unlimited access, so that I don't see references to subscriptions.

#### Acceptance Criteria

1. WHEN the /success route is accessed THEN the system SHALL redirect to the main application or show a generic success message
2. WHEN feature confirmations are shown THEN the system SHALL NOT mention subscription activation or Pro upgrades
3. IF welcome messages are displayed THEN the system SHALL indicate full access without payment confirmations
4. WHEN user status is displayed THEN the system SHALL show unlimited access without expiration dates

### Requirement 10: Remove Student Discount References

**User Story:** As a self-hosted user, I want no references to student discounts or special pricing, so that the interface is clean and relevant.

#### Acceptance Criteria

1. WHEN the about page is displayed THEN the system SHALL NOT show student discount sections
2. WHEN any pricing-related text appears THEN the system SHALL NOT mention special pricing or discounts
3. IF university email detection exists THEN the system SHALL remove or ignore this functionality
4. WHEN user onboarding occurs THEN the system SHALL NOT mention pricing tiers or discount eligibility