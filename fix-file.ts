import fs from 'fs';
let content = fs.readFileSync('src/components/features/RevenueAnalysis/index.tsx', 'utf8');

// I will just use regex to fix the Aksi columns.
// Let's find: `                                      </td>\n                                     )}` and replace it back to `                                      </td>`
content = content.replace(/                                      <\/td>\n                                     \)}\n                                    <\/tr>/g, '                                      </td>\n                                    </tr>');

// Find `                                          </td>\n                                         )}\n                                        </tr>\n                                       )}\n                                    </tbody>`
// and fix it
content = content.replace(/                                          <\/td>\n                                         \)}\n                                        <\/tr>\n                                       \)}\n                                    <\/tbody>/g, '                                          </td>\n                                        </tr>\n                                      ))}\n                                    </tbody>');

fs.writeFileSync('src/components/features/RevenueAnalysis/index.tsx', content);
