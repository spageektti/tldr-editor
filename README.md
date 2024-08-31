# TLDR-Editor

TLDR-Editor is a web-based application designed for editing and formatting markdown files using the TLDR-Lint library. It provides a user-friendly interface for linting and formatting markdown content, with GitHub OAuth authentication for secure access.

## Features
- User-friendly frontend for editing markdown files
- Linting and formatting capabilities using TLDR-Lint
- GitHub OAuth authentication for secure access to repositories

## Requirements
- A modern web browser
- A GitHub account for OAuth authentication

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/spageektti/tldr-editor.git
   cd tldr-editor
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

## Configuration
1. Rename the `template-.env` file to `.env`:
   ```bash
   mv template-.env .env
   ```

2. Fill in the required environment variables in the `.env` file:
   ```plaintext
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   GITHUB_REPO=your_github_repository
   ```

## Running the Application
1. Start the server:
   ```bash
   npm start
   ```

2. Access the application at `http://localhost:3000`.

**Note:** There is no public instance of this application for security reasons. Ensure that you keep your credentials secure and do not expose them publicly.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
