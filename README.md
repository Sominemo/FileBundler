# FileBundler
Electro Air File Bundler

# GENERAL COMMANDS
    help, --help, -h    Help file
    --version, -v       Alias for --help
    --debug             Enable extended debug output

# BUNDLING
    -f                  Relative paths to files
    -t                  Plain texts
    -tf                 Relative paths to text files in UTF-8 encoding
    -o                  Name and/or path for output file
    
# EXAMPLE COMMAND
    ./bundler -f attachment.zip -f design.ai -t "Hello, world" -f package.json -tf message.txt -t HelloWorld
